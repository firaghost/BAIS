# cPanel Deployment Guide for Laravel 11 Backend

1. **Prepare ZIP for cPanel:**
   To deploy the backend to cPanel without SSH access, you must package the application locally first.

   Run these commands in your local `d:\Projects\BAIS` directory:
   ```bash
   composer install --optimize-autoloader --no-dev
   ```
   *Note: If you need developer tools locally, do this in a separate cloned folder.*

   Create a ZIP file of the entire `BAIS` directory.
   **EXCLUDE these folders/files from the ZIP:**
   - `/node_modules`
   - `/.git`
   - `/tests`
   - `/.env` (You will configure this on cPanel directly)

2. **Upload to cPanel:**
   - Log into cPanel.
   - Open **File Manager**.
   - Navigate to the folder mapped to your API domain (e.g., `apiat.mirachpos.com`).
   - Upload the ZIP file.
   - Extract the ZIP file.

3. **Configure `.env`:**
   - Create or edit the `.env` file in the root of your extracted folder on cPanel.
   - Set the following production variables:
     ```env
     APP_ENV=production
     APP_DEBUG=false
     APP_URL=http://apiat.mirachpos.com
     FRONTEND_URL=http://att.mirachpos.com
     SESSION_DOMAIN=.mirachpos.com
     SANCTUM_STATEFUL_DOMAINS=att.mirachpos.com
     
     # Database credentials from your cPanel MySQL Databases:
     DB_CONNECTION=mysql
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_DATABASE=your_database_name
     DB_USERNAME=your_database_user
     DB_PASSWORD=your_database_password
     ```

4. **Point the Domain to `public`:**
   - In cPanel **Domains** or **Subdomains**, ensure the Document Root for `apiat.mirachpos.com` points directly to the `/public` directory inside your extracted Laravel folder (e.g., `/public_html/api/public`).

5. **Run Migrations (If you don't have SSH):**
   - You can export your local database using phpMyAdmin and import it into the cPanel database.
   - OR, create a temporary route in `routes/web.php` to run migrations:
     ```php
     Route::get('/run-migrations', function () {
         \Illuminate\Support\Facades\Artisan::call('migrate --force');
         return 'Migrated!';
     });
     ```
     *(Make sure to remove this route immediately after use!)*

6. **Clear Caches:**
   - Create a temporary route or use a Cron Job to optimize the app:
     ```php
     Route::get('/optimize-app', function () {
         \Illuminate\Support\Facades\Artisan::call('optimize:clear');
         \Illuminate\Support\Facades\Artisan::call('config:cache');
         \Illuminate\Support\Facades\Artisan::call('route:cache');
         \Illuminate\Support\Facades\Artisan::call('view:cache');
         return 'Optimized!';
     });
     ```
