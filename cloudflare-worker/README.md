# PERMIRA 2026 — OTP Backend (Cloudflare Workers + Zoho CPaaS)

Worker ini menggantikan `script.google.com` dengan kapasitas paket gratis Cloudflare hingga **100.000 request/hari** menggunakan **Durable Objects (SQLite)** agar aman dari *race condition* dan pembatasan kuota KV.

## Cara Deploy

1. Masuk ke folder `cloudflare-worker`:
   ```powershell
   cd cloudflare-worker
   npm install
   ```
2. Login ke akun Cloudflare Anda (akan membuka browser):
   ```powershell
   npx wrangler login
   ```
3. Simpan API key Zoho CPaaS Anda sebagai secret (tempel key dari tab **SMTP/API → API key** di Zoho):
   ```powershell
   npx wrangler secret put ZOHO_API_KEY
   ```
4. Deploy Worker:
   ```powershell
   npx wrangler deploy
   ```
   Salin URL yang muncul (contoh: `https://permira-otp-worker.<subdomain>.workers.dev`).

5. Perbarui `.env` di root proyek `Permira-2026`:
   ```env
   VITE_OTP_SCRIPT_URL=https://permira-otp-worker.<subdomain>.workers.dev
   ```
6. Kembali ke root proyek, lalu deploy frontend ke Firebase:
   ```powershell
   cd ..
   npm run deploy
   ```

## Variabel Opsional (`wrangler.jsonc`)
- `SENDER_EMAIL`: default `noreply@pemira-fikui.my.id`
- `SENDER_NAME`: default `Panitia PERMIRA 2026`
- `ALLOWED_EMAIL_DOMAIN`: kosongkan untuk semua domain, atau isi misalnya `ui.ac.id`
