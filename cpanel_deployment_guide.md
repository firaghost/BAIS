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

---

# cPanel Deployment Guide for React SPA (Frontend)

This guide is for the frontend React application (`att.mirachpos.com`).

1. **Build Locally:**
   On your local machine, run the build command to generate the production-ready files:
   ```bash
   npm run build
   ```
   *This uses `vite.spa.config.js` to create the `dist/` directory.*

2. **Upload to cPanel:**
   - Log into cPanel.
   - Open **File Manager**.
   - Navigate to the folder mapped to your frontend domain (e.g., `att.mirachpos.com`).
   - Upload ONLY the **contents** of the `dist/` folder (assets, index.html, etc.).
   - **Do NOT upload the whole project root (no node_modules, no src, etc.).**

3. **Configure `.htaccess` for Routing:**
   React uses client-side routing. If you refresh a page (like `/employees`), cPanel will try to find an `employees` file and return 404.
   Create a `.htaccess` file in the root of your frontend folder (where `index.html` is) with this content:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteCond %{REQUEST_FILENAME} !-l
     RewriteRule . /index.html [L]
   </IfModule>
   ```

4. **MIME Type Issues (Fix for `application/octet-stream`):**
   The error `main.jsx:1 Failed to load module script` happens because:
   - You are trying to serve `.jsx` files (Source code). Browsers only support `.js` modules.
   - cPanel doesn't recognize `.jsx` as JavaScript.
   **Solution:** Follow Step 1 and 2 above. The `dist/` folder will contain transpiled `.js` files that cPanel and browsers understand perfectly.

5. **Do you need to "start" anything?**
   - **No.** For a static SPA (built with Vite), cPanel's Apache server serves the files directly. You do not need to run a "Node.js Node App" or `npm start` on the server.
   - The frontend communicates with the backend via the API URL configured during the build.
