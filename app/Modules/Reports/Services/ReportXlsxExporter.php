<?php

declare(strict_types=1);

namespace App\Modules\Reports\Services;

use Box\Spout\Common\Entity\Style\Border;
use Box\Spout\Common\Entity\Style\CellAlignment;
use Box\Spout\Common\Entity\Style\Color;
use Box\Spout\Writer\Common\Creator\WriterEntityFactory;
use Box\Spout\Writer\Common\Creator\Style\BorderBuilder;
use Box\Spout\Writer\Common\Creator\Style\StyleBuilder;
use Box\Spout\Writer\XLSX\Writer;

class ReportXlsxExporter
{
    public function streamToOutput(array $report): void
    {
        $selected = [];
        if (is_array($report['summary'] ?? null) && is_array($report['summary']['selected_metrics'] ?? null)) {
            $selected = array_values(array_filter(array_map('strval', $report['summary']['selected_metrics'])));
        }
        $selectedSet = $selected !== [] ? array_fill_keys($selected, true) : [];

        $writer = WriterEntityFactory::createXLSXWriter();
        $writer->openToFile('php://output');

        $this->writeSummarySheet($writer, $report);

        if ($selectedSet === [] || isset($selectedSet['branch_breakdown'])) {
            $this->writeBranchBreakdownSheet($writer, $report);
        }

        if ($selectedSet === [] || isset($selectedSet['roster'])) {
            $this->writeDepartmentRosterSheet($writer, $report);
        }

        if ($selectedSet === [] || isset($selectedSet['attendance_register'])) {
            $this->writeAttendanceRegisterSheet($writer, $report);
        }

        if ($selectedSet === [] || isset($selectedSet['employee_summary'])) {
            $this->writeEmployeeSummarySheet($writer, $report);
        }

        if ($selectedSet === [] || isset($selectedSet['daily_summary'])) {
            $this->writeDailySummarySheet($writer, $report);
        }

        if ($selectedSet === [] || isset($selectedSet['exceptions'])) {
            $this->writeExceptionsSheet($writer, $report);
        }

        if ($selectedSet === [] || isset($selectedSet['late_arrivals'])) {
            $this->writeLateArrivalsSheet($writer, $report);
        }

        if ($selectedSet === [] || isset($selectedSet['device_health'])) {
            $this->writeDeviceHealthSheet($writer, $report);
        }

        $writer->close();
    }

    private function writeSummarySheet(Writer $writer, array $report): void
    {
        $sheet = $writer->getCurrentSheet();
        $sheet->setName('Summary');

        $this->writeSheetIntro($writer, $report, 'BAIS - Attendance Report');

        $writer->addRow(WriterEntityFactory::createRowFromArray(['Key', 'Value'], $this->headerStyle()));

        $generatedAt = $report['generated_at'] ?? null;
        $from = $report['from'] ?? null;
        $to = $report['to'] ?? null;
        $branch = $report['branch'] ?? null;

        $writer->addRow(WriterEntityFactory::createRowFromArray(['Generated At', (string) ($generatedAt ?? '')]));
        $writer->addRow(WriterEntityFactory::createRowFromArray(['From', (string) ($from ?? '')]));
        $writer->addRow(WriterEntityFactory::createRowFromArray(['To', (string) ($to ?? '')]));
        $writer->addRow(WriterEntityFactory::createRowFromArray(['Branch', (string) ($branch ?? 'All')]));

        $summary = is_array($report['summary'] ?? null) ? $report['summary'] : [];

        foreach ($summary as $key => $value) {
            $writer->addRow(WriterEntityFactory::createRowFromArray([(string) $key, $this->scalarOrJson($value)]));
        }
    }

    private function writeDepartmentRosterSheet(Writer $writer, array $report): void
    {
        $writer->addNewSheetAndMakeItCurrent();
        $writer->getCurrentSheet()->setName('Department Roster');

        $roster = is_array($report['roster'] ?? null) ? $report['roster'] : [];
        $dates = is_array($roster['dates'] ?? null) ? $roster['dates'] : [];
        $presence = is_array($roster['presence'] ?? null) ? $roster['presence'] : [];
        $departments = is_array($roster['departments'] ?? null) ? $roster['departments'] : [];
        $generatedAt = is_string($report['generated_at'] ?? null) ? (string) $report['generated_at'] : null;

        $columns = max(6, 3 + count($dates));
        $this->writeSheetIntroWithColumns($writer, $report, 'Department Attendance Roster', $columns);

        if ($dates === [] || $departments === []) {
            $writer->addRow(WriterEntityFactory::createRowFromArray(['No roster data available for the selected period.']));
            return;
        }

        foreach ($departments as $deptBlock) {
            $deptName = (string) ($deptBlock['department'] ?? 'General');
            $employees = is_array($deptBlock['employees'] ?? null) ? $deptBlock['employees'] : [];

            $writer->addRow(WriterEntityFactory::createRowFromArray([$deptName], $this->sectionStyle()));

            $header = ['No.', 'Emp Code', 'Employee Name'];
            foreach ($dates as $d) {
                $header[] = $this->formatRosterDateHeader((string) $d);
            }
            $writer->addRow(WriterEntityFactory::createRowFromArray($header, $this->headerStyle()));

            $i = 0;
            foreach ($employees as $e) {
                $i++;
                $empId = (string) ($e['employee_id'] ?? '');
                $cells = [
                    WriterEntityFactory::createCell($i, $this->rosterMetaCellStyle()),
                    WriterEntityFactory::createCell((string) ($e['employee_code'] ?? ''), $this->rosterMetaCellStyle()),
                    WriterEntityFactory::createCell((string) ($e['employee_name'] ?? ''), $this->rosterNameCellStyle()),
                ];

                foreach ($dates as $d) {
                    $day = (string) $d;
                    if ($this->isWeekend($day)) {
                        $cells[] = WriterEntityFactory::createCell('', $this->rosterMarkCellStyle());
                        continue;
                    }

                    if ($this->isFutureDay($day, $generatedAt)) {
                        $cells[] = WriterEntityFactory::createCell('', $this->rosterMarkCellStyle());
                        continue;
                    }

                    $isPresent = isset($presence[$empId]) && is_array($presence[$empId]) && !empty($presence[$empId][$day]);
                    $cells[] = WriterEntityFactory::createCell($isPresent ? '✓' : '×', $this->rosterMarkCellStyle());
                }

                $writer->addRow(WriterEntityFactory::createRow($cells));
            }

            $writer->addRow(WriterEntityFactory::createRowFromArray(['']));
        }
    }

    private function formatRosterDateHeader(string $date): string
    {
        $ts = strtotime($date);
        if (!$ts) {
            return $date;
        }

        $dow = date('D', $ts);
        $map = [
            'Mon' => 'Mo',
            'Tue' => 'Tu',
            'Wed' => 'We',
            'Thu' => 'Th',
            'Fri' => 'Fr',
            'Sat' => 'Sa',
            'Sun' => 'Su',
        ];

        $abbr = $map[$dow] ?? $dow;
        return $abbr.'/'.date('M/d', $ts);
    }

    private function isFutureDay(string $date, ?string $generatedAt): bool
    {
        $ts = strtotime($date);
        if (!$ts) {
            return false;
        }

        $ref = null;
        if (is_string($generatedAt) && trim($generatedAt) !== '') {
            $ref = strtotime(substr(trim($generatedAt), 0, 10));
        }
        $ref = $ref ?: strtotime(date('Y-m-d'));

        return $ts > $ref;
    }

    private function isWeekend(string $date): bool
    {
        $ts = strtotime($date);
        if (!$ts) {
            return false;
        }

        $dow = (int) date('N', $ts);
        return $dow === 7;
    }

    private function sectionStyle(): \Box\Spout\Common\Entity\Style\Style
    {
        $border = (new BorderBuilder())
            ->setBorderBottom(Color::rgb(203, 213, 225), Border::WIDTH_THIN, Border::STYLE_SOLID)
            ->build();

        return (new StyleBuilder())
            ->setFontBold()
            ->setFontSize(12)
            ->setFontColor(Color::rgb(10, 31, 67))
            ->setBackgroundColor(Color::rgb(241, 245, 249))
            ->setBorder($border)
            ->build();
    }

    private function rosterRowStyle(): \Box\Spout\Common\Entity\Style\Style
    {
        return (new StyleBuilder())->setFontSize(10)->build();
    }

    private function rosterMetaCellStyle(): \Box\Spout\Common\Entity\Style\Style
    {
        return (new StyleBuilder())
            ->setFontSize(10)
            ->setCellAlignment(CellAlignment::CENTER)
            ->build();
    }

    private function rosterNameCellStyle(): \Box\Spout\Common\Entity\Style\Style
    {
        return (new StyleBuilder())
            ->setFontSize(10)
            ->setCellAlignment(CellAlignment::LEFT)
            ->setShouldWrapText()
            ->build();
    }

    private function rosterMarkCellStyle(): \Box\Spout\Common\Entity\Style\Style
    {
        return (new StyleBuilder())
            ->setFontBold()
            ->setFontSize(10)
            ->setCellAlignment(CellAlignment::CENTER)
            ->build();
    }

    private function writeBranchBreakdownSheet(Writer $writer, array $report): void
    {
        $writer->addNewSheetAndMakeItCurrent();
        $writer->getCurrentSheet()->setName('Branch Breakdown');

        $this->writeSheetIntroWithColumns($writer, $report, 'Branch Breakdown', 6);

        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'branch_id',
            'branch_name',
            'employees',
            'present_days',
            'expected_days',
            'compliance_percent',
        ], $this->headerStyle()));

        $rows = is_array($report['branch_breakdown'] ?? null) ? $report['branch_breakdown'] : [];

        foreach ($rows as $r) {
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                $r['branch_id'] ?? null,
                $r['branch_name'] ?? null,
                $r['employees'] ?? null,
                $r['present_days'] ?? null,
                $r['expected_days'] ?? null,
                $r['compliance_percent'] ?? null,
            ]));
        }
    }

    private function writeLateArrivalsSheet(Writer $writer, array $report): void
    {
        $writer->addNewSheetAndMakeItCurrent();
        $writer->getCurrentSheet()->setName('Late Arrivals');

        $this->writeSheetIntroWithColumns($writer, $report, 'Late Arrivals', 6);

        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'log_date',
            'employee_id',
            'employee_name',
            'branch_name',
            'late_minutes',
            'check_in_time',
        ], $this->headerStyle()));

        $rows = is_array($report['late_arrivals'] ?? null) ? $report['late_arrivals'] : [];

        foreach ($rows as $r) {
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                $r['log_date'] ?? null,
                $r['employee_id'] ?? null,
                $r['employee_name'] ?? null,
                $r['branch_name'] ?? null,
                $r['late_minutes'] ?? null,
                $r['check_in_time'] ?? null,
            ]));
        }
    }

    private function writeDeviceHealthSheet(Writer $writer, array $report): void
    {
        $writer->addNewSheetAndMakeItCurrent();
        $writer->getCurrentSheet()->setName('Device Health');

        $this->writeSheetIntroWithColumns($writer, $report, 'Device Health', 6);

        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'branch_id',
            'branch_name',
            'total_devices',
            'active_devices',
            'offline_devices',
            'health_percent',
        ], $this->headerStyle()));

        $rows = is_array($report['device_health_by_branch'] ?? null) ? $report['device_health_by_branch'] : [];

        foreach ($rows as $r) {
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                $r['branch_id'] ?? null,
                $r['branch_name'] ?? null,
                $r['total_devices'] ?? null,
                $r['active_devices'] ?? null,
                $r['offline_devices'] ?? null,
                $r['health_percent'] ?? null,
            ]));
        }
    }

    private function writeAttendanceRegisterSheet(Writer $writer, array $report): void
    {
        $writer->addNewSheetAndMakeItCurrent();
        $writer->getCurrentSheet()->setName('Attendance Register');

        $this->writeSheetIntroWithColumns($writer, $report, 'Attendance Register', 12);

        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'log_date',
            'branch_name',
            'employee_code',
            'employee_name',
            'status',
            'check_in_time',
            'check_out_time',
            'late_minutes',
            'worked_hours',
            'day_type',
            'early_leave_minutes',
            'overtime_minutes',
        ], $this->headerStyle()));

        $rows = is_array($report['attendance_rows'] ?? null) ? $report['attendance_rows'] : [];

        foreach ($rows as $r) {
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                $r['log_date'] ?? null,
                $r['branch_name'] ?? null,
                $r['employee_code'] ?? null,
                $r['employee_name'] ?? null,
                $r['status'] ?? null,
                $r['check_in_time'] ?? null,
                $r['check_out_time'] ?? null,
                $r['late_minutes'] ?? null,
                $r['worked_hours'] ?? null,
                $r['day_type'] ?? null,
                $r['early_leave_minutes'] ?? null,
                $r['overtime_minutes'] ?? null,
            ]));
        }
    }

    private function writeEmployeeSummarySheet(Writer $writer, array $report): void
    {
        $writer->addNewSheetAndMakeItCurrent();
        $writer->getCurrentSheet()->setName('Employee Summary');

        $this->writeSheetIntroWithColumns($writer, $report, 'Employee Summary', 12);

        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'branch_name',
            'employee_code',
            'employee_name',
            'days_recorded',
            'full_days',
            'half_days',
            'early_leave_days',
            'late_days',
            'late_minutes_total',
            'worked_hours_total',
            'overtime_minutes_total',
            'missing_checkout_days',
        ], $this->headerStyle()));

        $rows = is_array($report['employee_summary'] ?? null) ? $report['employee_summary'] : [];

        foreach ($rows as $r) {
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                $r['branch_name'] ?? null,
                $r['employee_code'] ?? null,
                $r['employee_name'] ?? null,
                $r['days_recorded'] ?? null,
                $r['full_days'] ?? null,
                $r['half_days'] ?? null,
                $r['early_leave_days'] ?? null,
                $r['late_days'] ?? null,
                $r['late_minutes_total'] ?? null,
                $r['worked_hours_total'] ?? null,
                $r['overtime_minutes_total'] ?? null,
                $r['missing_checkout_days'] ?? null,
            ]));
        }
    }

    private function writeDailySummarySheet(Writer $writer, array $report): void
    {
        $writer->addNewSheetAndMakeItCurrent();
        $writer->getCurrentSheet()->setName('Daily Summary');

        $this->writeSheetIntroWithColumns($writer, $report, 'Daily Summary', 6);

        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'log_date',
            'employees_present',
            'late_count',
            'late_minutes_total',
            'overtime_minutes_total',
            'missing_checkout_count',
        ], $this->headerStyle()));

        $rows = is_array($report['daily_summary'] ?? null) ? $report['daily_summary'] : [];

        foreach ($rows as $r) {
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                $r['log_date'] ?? null,
                $r['employees_present'] ?? null,
                $r['late_count'] ?? null,
                $r['late_minutes_total'] ?? null,
                $r['overtime_minutes_total'] ?? null,
                $r['missing_checkout_count'] ?? null,
            ]));
        }
    }

    private function writeExceptionsSheet(Writer $writer, array $report): void
    {
        $writer->addNewSheetAndMakeItCurrent();
        $writer->getCurrentSheet()->setName('Exceptions');

        $this->writeSheetIntroWithColumns($writer, $report, 'Exceptions', 10);

        $writer->addRow(WriterEntityFactory::createRowFromArray([
            'exception_type',
            'log_date',
            'branch_name',
            'employee_code',
            'employee_name',
            'late_minutes',
            'check_in_time',
            'check_out_time',
            'worked_hours',
            'early_leave_minutes',
        ], $this->headerStyle()));

        $rows = is_array($report['exceptions'] ?? null) ? $report['exceptions'] : [];

        foreach ($rows as $r) {
            $writer->addRow(WriterEntityFactory::createRowFromArray([
                $r['exception_type'] ?? null,
                $r['log_date'] ?? null,
                $r['branch_name'] ?? null,
                $r['employee_code'] ?? null,
                $r['employee_name'] ?? null,
                $r['late_minutes'] ?? null,
                $r['check_in_time'] ?? null,
                $r['check_out_time'] ?? null,
                $r['worked_hours'] ?? null,
                $r['early_leave_minutes'] ?? null,
            ]));
        }
    }

    private function writeSheetIntro(Writer $writer, array $report, string $title): void
    {
        $writer->addRow(WriterEntityFactory::createRowFromArray([$title], $this->titleStyle()));

        $meta = [
            ['Generated At', (string) ($report['generated_at'] ?? '')],
            ['From', (string) ($report['from'] ?? '')],
            ['To', (string) ($report['to'] ?? '')],
            ['Branch', (string) ($report['branch'] ?? 'All')],
        ];

        foreach ($meta as $row) {
            $writer->addRow(WriterEntityFactory::createRowFromArray($row, $this->metaStyle()));
        }

        $writer->addRow(WriterEntityFactory::createRowFromArray(['']));
    }

    private function writeSheetIntroWithColumns(Writer $writer, array $report, string $title, int $columns): void
    {
        $columns = max(1, $columns);
        $row = array_fill(0, $columns, '');
        $row[(int) floor(($columns - 1) / 2)] = $title;
        $writer->addRow(WriterEntityFactory::createRowFromArray($row, $this->titleStyle()));

        $metaRows = [
            ['Generated At', (string) ($report['generated_at'] ?? '')],
            ['From', (string) ($report['from'] ?? '')],
            ['To', (string) ($report['to'] ?? '')],
            ['Branch', (string) ($report['branch'] ?? 'All')],
        ];

        foreach ($metaRows as $r) {
            $meta = array_fill(0, $columns, '');
            $meta[0] = $r[0];
            $meta[1] = $r[1];
            $writer->addRow(WriterEntityFactory::createRowFromArray($meta, $this->metaStyle()));
        }

        $writer->addRow(WriterEntityFactory::createRowFromArray(array_fill(0, $columns, '')));
    }

    private function titleStyle(): \Box\Spout\Common\Entity\Style\Style
    {
        $border = (new BorderBuilder())
            ->setBorderBottom(Color::rgb(203, 213, 225), Border::WIDTH_THIN, Border::STYLE_SOLID)
            ->build();

        return (new StyleBuilder())
            ->setFontBold()
            ->setFontSize(14)
            ->setFontColor(Color::rgb(10, 31, 67))
            ->setCellAlignment(CellAlignment::CENTER)
            ->setBorder($border)
            ->build();
    }

    private function metaStyle(): \Box\Spout\Common\Entity\Style\Style
    {
        return (new StyleBuilder())
            ->setFontSize(11)
            ->setFontColor(Color::rgb(71, 85, 105))
            ->build();
    }

    private function headerStyle(): \Box\Spout\Common\Entity\Style\Style
    {
        $border = (new BorderBuilder())
            ->setBorderBottom(Color::rgb(203, 213, 225), Border::WIDTH_THIN, Border::STYLE_SOLID)
            ->build();

        return (new StyleBuilder())
            ->setFontBold()
            ->setFontColor(Color::WHITE)
            ->setBackgroundColor(Color::rgb(10, 31, 67))
            ->setCellAlignment(CellAlignment::CENTER)
            ->setShouldWrapText()
            ->setBorder($border)
            ->build();
    }

    private function scalarOrJson(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        if (is_scalar($value)) {
            return (string) $value;
        }

        return (string) json_encode($value, JSON_UNESCAPED_UNICODE);
    }
}
