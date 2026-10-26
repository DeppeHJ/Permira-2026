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
   - Buat 3 akun admin (Email/Password) sesuai `VITE_ADMIN_EMAILS`.
   - Buat 1 akun Super Admin (Email/Password) sesuai `VITE_SUPER_ADMIN_EMAILS` (contoh: `superadmin@kpu.ac.id`).
   - Lalu **nonaktifkan pendaftaran mandiri**
     (Authentication → Settings → User actions → matikan "Enable create (sign-up)").
   - Firestore → buat database, lalu `firebase deploy --only firestore:rules` (atau tempel isi `firestore.rules`).
   - Pastikan daftar email di fungsi `isKpuAdmin()` dan `isSuperAdmin()` pada `firestore.rules` sama dengan `.env`.
4. Pasang `google-apps-script/Code.gs` (petunjuk di komentar file), deploy sebagai Web App, isi `VITE_OTP_SCRIPT_URL`.
5. `npm run dev`.
   - Portal Pemilih: `http://localhost:5173/`
   - Portal KPU: `http://localhost:5173/#/kpu`
   - Portal Super Admin: `http://localhost:5173/#/superadmin`

## Hak Akses & Fitur Super Admin (`#/superadmin`)

1. **Periode & Reset Data**:
   - Mengubah nama dan tahun pemilihan (misalnya 2027, 2028, dst.) serta jumlah angkatan.
   - Mengunduh cadangan data (kehadiran pemilih & rekapitulasi suara kandidat ke file `.csv`).
   - Mereset DPT dan mengosongkan kotak suara dengan konfirmasi proteksi ketik kata `HAPUS`.
2. **Timeline Pemilihan**:
   - Menyesuaikan tanggal, judul, dan status tahapan (Selesai, Sedang Berlangsung, Akan Datang) serta urutannya.
3. **SOP Pemilihan**:
   - Menyesuaikan tab kategori, deskripsi, dan butir-butir aturan (satu per baris).
4. **Kandidat & Paslon**:
   - Mengubah nomor urut, foto (unggah langsung terkompresi otomatis atau URL), nama, jurusan, angkatan, slogan, visi, misi, dan program prioritas.
   - Menambah calon AI maupun pasangan calon Kabem & Wakabem baru.
   - Menghapus calon dengan konfirmasi dialog.

## Alur data

- `config/{election, timeline, sop}`: pengaturan dinamis yang dikontrol Super Admin.
- `candidates/{id}`: data paslon dinamis (AI & Kabem).
- `dpt/{npm}`: identitas pemilih (`hasVoted`, `votedAt`).
- `votes/{auto-id}`: `{ aiId, kabemId }` — tanpa NPM/email/nama/waktu.
- `stats/{angkatan}`: total & jumlah sudah memilih (untuk dashboard pemilih).
- Format CSV DPT: `npm,nama,email,angkatan` (unduh templat dari dashboard KPU).
