# PERMIRA 2026 — OTP Backend (Cloudflare Workers + Mailketing / Zoho CPaaS)

Worker ini menggantikan `script.google.com` dengan kapasitas paket gratis Cloudflare hingga **100.000 request/hari** menggunakan **Durable Objects (SQLite)** agar aman dari *race condition* dan pembatasan kuota KV.

## Cara Deploy (Mailketing - Default)

1. Masuk ke folder `cloudflare-worker`:
   ```powershell
   cd cloudflare-worker
   npm install
   ```
2. Login ke akun Cloudflare Anda (akan membuka browser):
   ```powershell
   npx wrangler login
   ```
3. Simpan API Token Mailketing Anda sebagai secret (ambil dari dashboard Mailketing **Pengaturan → API Email**):
   ```powershell
   npx wrangler secret put MAILKETING_API_TOKEN
   ```
   *(Opsional jika ingin fallback ke Zoho CPaaS: ubah `"MAIL_PROVIDER": "ZOHO"` di `wrangler.jsonc` dan jalankan `npx wrangler secret put ZOHO_API_KEY`.)*
4. Deploy Worker:
   ```powershell
   npx wrangler deploy
   ```
   Salin URL yang muncul (contoh: `https://permira-otp-worker.<subdomain>.workers.dev`).

5. Pastikan `.env` di root proyek `Permira-2026` sudah mengarah ke Worker:
   ```env
   VITE_OTP_SCRIPT_URL=https://permira-otp-worker.<subdomain>.workers.dev
   ```
6. Kembali ke root proyek, lalu deploy frontend ke Firebase:
   ```powershell
   cd ..
   npm run deploy
   ```

## Variabel Opsional (`wrangler.jsonc`)
- `MAIL_PROVIDER`: `MAILKETING` (default) atau `ZOHO`
- `MAILKETING_API_URL`: default `https://api.mailketing.co.id/api/v2/send`
- `SENDER_EMAIL`: default `noreply@pemira-fikui.my.id`
- `SENDER_NAME`: default `Panitia PERMIRA 2026`
- `ALLOWED_EMAIL_DOMAIN`: kosongkan untuk semua domain, atau isi misalnya `ui.ac.id`
