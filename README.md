# PERMIRA 2026 — E-Voting Pemilihan Raya Mahasiswa

React (Vite) + Tailwind CSS v4 + Firebase (Auth & Firestore) + Google Apps Script (OTP email).

## Struktur

```
src/
  index.css            tema "Dark Luxury Academic" + font Plus Jakarta Sans
  data.js              kandidat, SOP, angkatan, konstanta warna
  config.js firebase.js
  components/SharedUI.jsx   TopNav, Stepper, Toast, CandidateCard, CandidateModal
  pages/               Login, Dashboard, Sop, Voting, ReviewOtp, Success, AdminLogin, AdminDashboard
  services/            votingService, otpService, adminService
  utils/               csv, dpt, format
firestore.rules
google-apps-script/Code.gs
```

## Menjalankan

1. `npm install`
2. Salin `.env.example` ke `.env` dan isi nilainya (Firebase, URL Apps Script, 3 email admin).
3. Firebase Console:
   - Authentication → aktifkan **Anonymous** dan **Email/Password**.
   - Buat 3 akun admin (Email/Password) sesuai `VITE_ADMIN_EMAILS`, lalu **nonaktifkan pendaftaran mandiri**
     (Authentication → Settings → User actions → matikan "Enable create (sign-up)").
   - Firestore → buat database, lalu `firebase deploy --only firestore:rules` (atau tempel `firestore.rules`).
   - Ubah daftar email admin di `firestore.rules` agar sama dengan `.env`.
4. Pasang `google-apps-script/Code.gs` (petunjuk di komentar file), deploy sebagai Web App, isi `VITE_OTP_SCRIPT_URL`.
5. `npm run dev`. Portal KPU: `http://localhost:5173/#/kpu`.

## Alur data

- `dpt/{npm}`: identitas pemilih (`hasVoted`, `votedAt`).
- `votes/{auto-id}`: `{ aiId, kabemId }` — tanpa NPM/email/nama/waktu.
- `stats/{angkatan}`: total & jumlah sudah memilih (untuk dashboard pemilih).
- Format CSV DPT: `npm,nama,email,angkatan` (unduh templat dari dashboard KPU).
