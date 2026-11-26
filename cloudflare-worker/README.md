# PERMIRA 2026 — OTP Backend (Cloudflare Workers + Brevo / Mailketing / Zoho CPaaS)

Worker ini menggantikan `script.google.com` dengan kapasitas paket gratis Cloudflare hingga **100.000 request/hari** menggunakan **Durable Objects (SQLite)** agar aman dari *race condition* dan pembatasan kuota KV.

## Cara Deploy (Brevo - Default)

1. Masuk ke folder `cloudflare-worker`:
   ```powershell
   cd cloudflare-worker
   npm install
   ```
2. Login ke akun Cloudflare Anda (akan membuka browser):
   ```powershell
   npx wrangler login
   ```
3. Simpan API Key Brevo Anda sebagai secret (ambil dari dashboard Brevo **SMTP & API → API Keys → Generate a new API key**):
   ```powershell
   npx wrangler secret put BREVO_API_KEY
   ```
   *(Opsional fallback: ubah `"MAIL_PROVIDER"` di `wrangler.jsonc` menjadi `"MAILKETING"` dengan secret `MAILKETING_API_TOKEN`, atau `"ZOHO"` dengan secret `ZOHO_API_KEY`.)*
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
- `MAIL_PROVIDER`: `BREVO` (default), `MAILKETING`, atau `ZOHO`
- `BREVO_API_URL`: default `https://api.brevo.com/v3/smtp/email`
- `MAILKETING_API_URL`: default `https://api.mailketing.co.id/api/v2/send`
- `SENDER_EMAIL`: default `noreply@pemira-fikui.my.id`
- `SENDER_NAME`: default `PANITIA PEMIRA IKM FIK UI 2026`
- `ALLOWED_EMAIL_DOMAIN`: kosongkan untuk semua domain, atau isi misalnya `ui.ac.id`
