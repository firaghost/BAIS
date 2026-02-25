class User {
  final int id;
  final String name;
  final String email;
  final bool mustChangePassword;
  final Employee? employee;

  User({
    required this.id,
    required this.name,
    required this.email,
    this.mustChangePassword = false,
    this.employee,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as int,
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      mustChangePassword: json['must_change_password'] == true,
      employee: json['employee'] != null
          ? Employee.fromJson(json['employee'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
      };
}

class Employee {
  final int id;
  final String employeeCode;
  final String firstName;
  final String? middleName;
  final String lastName;
  final String? phone;
  final String? email;
  final String? jobTitle;
  final String? department;
  final String? photoPath;
  final int? branchId;

  Employee({
    required this.id,
    required this.employeeCode,
    required this.firstName,
    this.middleName,
    required this.lastName,
    this.phone,
    this.email,
    this.jobTitle,
    this.department,
    this.photoPath,
    this.branchId,
  });

  String get fullName {
    if (middleName != null && middleName!.isNotEmpty) {
      return '$firstName $middleName $lastName';
    }
    return '$firstName $lastName';
  }

  String get shortName {
    final lastInitial = lastName.isNotEmpty ? lastName[0] : '';
    return '$firstName.$lastInitial';
  }

  factory Employee.fromJson(Map<String, dynamic> json) {
    return Employee(
      id: json['id'] as int,
      employeeCode: json['employee_code'] as String? ?? '',
      firstName: json['first_name'] as String? ?? '',
      middleName: json['middle_name'] as String?,
      lastName: json['last_name'] as String? ?? '',
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      jobTitle: json['job_title'] as String?,
      department: json['department'] as String?,
      photoPath: json['photo_path'] as String?,
      branchId: json['branch_id'] as int?,
    );
  }
}
