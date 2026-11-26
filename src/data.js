/**
 * Data statis PERMIRA 2026: konstanta warna, kategori angkatan, kandidat,
 * isi SOP, dan jadwal pemilihan.
 *
 * Catatan: nama kandidat, visi, misi, dan jadwal di bawah ini adalah data contoh.
 * Ganti sesuai keputusan resmi Panitia sebelum dipakai di pemilihan sebenarnya.
 * ID kandidat (`ai-01`, `bem-01`, dst.) juga tercantum di firestore.rules —
 * ubah di kedua tempat jika jumlah kandidat berubah.
 */

export const COLORS = {
  bgPrimary: '#3D1203',
  surfaceCardDark: '#2A0B02',
  surfaceCardDarker: '#230801',
  brandPrimary: '#BA3D03',
  brandAccent: '#E48523',
  textGold: '#E8C580',
  surfaceWhite: '#FFFFFF',
  textDark: '#1F110B',
}

/** Deskripsi sambutan bawaan pada hero banner Dashboard pemilih. */
export function buildDefaultDescription(appName = 'PEMIRA IKM FIK UI 2026') {
  return `Selamat datang di ${appName}. Gunakan hak suara Anda untuk memilih Anggota Independen dan Ketua/Wakil Ketua BEM. Pilihan Anda rahasia dan menentukan arah kampus.`
}

/** Pengaturan pemilihan bawaan. Super Admin dapat menimpanya lewat `config/election`. */
export const DEFAULT_ELECTION = {
  name: 'PEMIRA IKM FIK UI',
  year: 2026,
  angkatanCount: 4,
  description: buildDefaultDescription('PEMIRA IKM FIK UI 2026'),
}

export const APP_NAME = `${DEFAULT_ELECTION.name} ${DEFAULT_ELECTION.year}`

/** Narahubung resmi pemilihan (Contact Person). Super Admin dapat menimpanya via `config/contacts`. */
export const DEFAULT_CONTACTS = [
  {
    id: 'cp-01',
    nickname: '',
    name: 'Helpdesk Teknis & OTP 1',
    phone: '0812-3456-7891',
    whatsapp: '6281234567891',
    available: '08.00 - 21.00 WIB',
  },
  {
    id: 'cp-02',
    nickname: '',
    name: 'Helpdesk Teknis & OTP 2',
    phone: '0812-3456-7892',
    whatsapp: '6281234567892',
    available: '08.00 - 21.00 WIB',
  },
  {
    id: 'cp-03',
    nickname: '',
    name: 'Divisi DPT & Data Pemilih Panitia',
    phone: '0812-3456-7893',
    whatsapp: '6281234567893',
    available: '08.00 - 20.00 WIB',
  },
  {
    id: 'cp-04',
    nickname: '',
    name: 'Humas & Protokoler Panitia',
    phone: '0812-3456-7894',
    whatsapp: '6281234567894',
    available: '09.00 - 20.00 WIB',
  },
  {
    id: 'cp-05',
    nickname: '',
    name: 'Panitia Pengawas Pemilu (Panwaslu)',
    phone: '0812-3456-7895',
    whatsapp: '6281234567895',
    available: '24 Jam Selama Pemilihan',
  },
]

/** FAQ bawaan pada halaman Narahubung & Pusat Bantuan. Super Admin dapat menimpanya via `config/faqs`. */
export const DEFAULT_FAQS = [
  {
    id: 'faq-01',
    question: 'OTP tidak masuk ke email UI?',
    answer:
      'Periksa folder Spam / Promosi di akun email kampus Anda. Kode OTP berlaku selama 3 menit dan hanya dapat dipakai sekali. Jika belum masuk, tunggu hitung mundur selesai lalu klik Kirim Ulang OTP atau hubungi Narahubung di bawah.',
  },
  {
    id: 'faq-02',
    question: 'NPM tidak terdaftar di DPT?',
    answer:
      'Pastikan format penulisan NPM Anda benar (hanya angka). Jika masih dinyatakan tidak terdaftar, silakan hubungi Divisi DPT Panitia untuk pengecekan status mahasiswa aktif.',
  },
  {
    id: 'faq-03',
    question: 'Apakah pilihan saya rahasia?',
    answer:
      '100% Rahasia. Sistem menggunakan arsitektur pemisahan basis data: identitas Anda (DPT) disimpan terpisah dari kotak suara anonim. Panitia maupun pengawas tidak dapat melihat siapa memilih siapa.',
  },
  {
    id: 'faq-04',
    question: 'Sesi memilih terputus atau error?',
    answer:
      'Hak suara Anda baru dianggap terpakai ketika Anda sudah berhasil memasukkan kode OTP pada halaman Review. Jika koneksi terputus sebelumnya, Anda dapat langsung masuk kembali.',
  },
]

/**
 * Bangun kategori pemilih per angkatan dari tahun pemilihan.
 * Format standar:
 * S1 (4 angkatan), S2 (2 angkatan), S3 (2 angkatan), PROFESI, RPL (3 angkatan).
 * `key` dipakai sebagai ID dokumen koleksi `stats`.
 */
export function buildAngkatan(year = DEFAULT_ELECTION.year) {
  const baseYear = Number(year) || DEFAULT_ELECTION.year
  const yy = (offset = 0) => String((baseYear - offset) % 100).padStart(2, '0')

  return [
    { key: `S1-${yy(0)}`, label: `S1-${yy(0)}` },
    { key: `S1-${yy(1)}`, label: `S1-${yy(1)}` },
    { key: `S1-${yy(2)}`, label: `S1-${yy(2)}` },
    { key: `S1-${yy(3)}`, label: `S1-${yy(3)}` },
    { key: `S2-${yy(0)}`, label: `S2-${yy(0)}` },
    { key: `S2-${yy(1)}`, label: `S2-${yy(1)}` },
    { key: `S3-${yy(0)}`, label: `S3-${yy(0)}` },
    { key: `S3-${yy(1)}`, label: `S3-${yy(1)}` },
    { key: 'PROFESI', label: 'PROFESI' },
    { key: `RPL-${yy(0)}`, label: `RPL-${yy(0)}` },
    { key: `RPL-${yy(1)}`, label: `RPL-${yy(1)}` },
    { key: `RPL-${yy(2)}`, label: `RPL-${yy(2)}` },
  ]
}

/** 12 kategori pemilih bawaan. Gunakan `useElection().angkatan` untuk nilai aktif. */
export const DEFAULT_ANGKATAN = buildAngkatan(DEFAULT_ELECTION.year)
export const ANGKATAN = DEFAULT_ANGKATAN

/** Kandidat Anggota Independen (AI) — pilih 1. */
export const AI_CANDIDATES = [
  {
    id: 'ai-01',
    type: 'ai',
    number: '01',
    name: 'Alya Rahmawati',
    role: 'Calon Anggota Independen',
    study: 'Teknik Informatika, Angkatan 2023',
    photo: '/images/ai-01.jpg',
    tagline: 'Mendengar tanpa sekat, bergerak bersama mahasiswa.',
    visi: 'Menjadi penghubung aspirasi yang inklusif, sehingga setiap suara mahasiswa tersampaikan dan ditindaklanjuti secara terbuka.',
    misi: [
      'Membuka kanal aspirasi digital yang dipantau dan dilaporkan setiap bulan.',
      'Mengadakan forum dengar pendapat rutin lintas program studi.',
      'Mengawal transparansi anggaran kegiatan kemahasiswaan.',
      'Mendorong pelibatan mahasiswa Magister dan Pascasarjana dalam kegiatan kampus.',
    ],
  },
  {
    id: 'ai-02',
    type: 'ai',
    number: '02',
    name: 'Dimas Hartono',
    role: 'Calon Anggota Independen',
    study: 'Manajemen, Angkatan 2024',
    photo: '/images/ai-02.jpg',
    tagline: 'Independen, objektif, dan berpihak pada mahasiswa.',
    visi: 'Menjaga independensi lembaga kemahasiswaan agar setiap keputusan berpijak pada kepentingan seluruh mahasiswa.',
    misi: [
      'Menyusun mekanisme evaluasi kinerja organisasi kemahasiswaan secara berkala.',
      'Memfasilitasi advokasi akademik dan fasilitas kampus.',
      'Mengembangkan program pendampingan bagi mahasiswa baru.',
      'Memperkuat budaya kritis yang santun dan berbasis data.',
    ],
  },
  {
    id: 'ai-03',
    type: 'ai',
    number: '03',
    name: 'Raka Mahendra Putra',
    role: 'Calon Anggota Independen',
    study: 'Ilmu Komunikasi, Angkatan 2023',
    photo: '/images/ai-03.jpg',
    tagline: 'Kampus yang bersuara, terbuka, dan saling peduli.',
    visi: 'Mewujudkan ruang kampus yang aman, terbuka, dan berdaya bagi seluruh mahasiswa melalui komunikasi yang jujur.',
    misi: [
      'Mengampanyekan lingkungan kampus yang aman dan bebas perundungan.',
      'Menyediakan pelatihan kepemimpinan dan literasi organisasi.',
      'Menerbitkan ringkasan kebijakan kemahasiswaan yang mudah dipahami.',
      'Menjalin kolaborasi dengan alumni untuk pengembangan karier.',
    ],
  },
]

/** Pasangan calon Ketua/Wakil BEM (Kabem) — pilih 1. */
export const KABEM_CANDIDATES = [
  {
    id: 'bem-01',
    type: 'kabem',
    number: '01',
    name: 'Rafi Aditya Pratama & Nadia Zahra Kirana',
    ketua: 'Rafi Aditya Pratama',
    wakil: 'Nadia Zahra Kirana',
    role: 'Calon Ketua & Wakil Ketua BEM',
    study: 'Teknik Industri 2023 · Psikologi 2023',
    photo: '/images/bem-01.jpg',
    tagline: 'Kolaborasi tanpa sekat, kampus berdampak.',
    visi: 'Mewujudkan BEM yang kolaboratif, adaptif, dan berdampak nyata bagi mahasiswa serta masyarakat sekitar kampus.',
    misi: [
      'Membangun ekosistem kolaborasi antar organisasi mahasiswa dan fakultas.',
      'Menghadirkan program pengembangan kompetensi dan kewirausahaan mahasiswa.',
      'Mengoptimalkan layanan advokasi dan kesejahteraan mahasiswa.',
      'Menjalankan program pengabdian masyarakat yang terukur dampaknya.',
      'Menerapkan pelaporan kinerja BEM yang terbuka setiap semester.',
    ],
    programs: ['Kolaborasi Fakultas', 'Inkubator Wirausaha', 'Pengabdian Terukur'],
  },
  {
    id: 'bem-02',
    type: 'kabem',
    number: '02',
    name: 'Bima Surya Wijaya & Salsabila Putri Anindya',
    ketua: 'Bima Surya Wijaya',
    wakil: 'Salsabila Putri Anindya',
    role: 'Calon Ketua & Wakil Ketua BEM',
    study: 'Hukum 2023 · Akuntansi 2024',
    photo: '/images/bem-02.jpg',
    tagline: 'Inklusif, transparan, dan berprestasi.',
    visi: 'Menjadikan BEM rumah bersama yang inklusif, transparan, dan mendorong prestasi akademik maupun non-akademik.',
    misi: [
      'Menjamin akses partisipasi yang setara bagi seluruh angkatan dan jenjang studi.',
      'Menerapkan keterbukaan informasi anggaran dan program kerja.',
      'Memperluas dukungan lomba, riset, dan kegiatan prestasi mahasiswa.',
      'Memperkuat layanan kesehatan mental dan konseling sebaya.',
      'Menjalin kemitraan dengan industri dan alumni untuk magang dan karier.',
    ],
    programs: ['Akses Setara', 'Dana Prestasi', 'Konseling Sebaya'],
  },
]

export const KOTAK_KOSONG_ID = 'bem-kotak-kosong'

/** Opsi Kotak Kosong bawaan untuk pemilihan Ketua & Wakil Ketua BEM. */
export const DEFAULT_KOTAK_KOSONG = {
  id: KOTAK_KOSONG_ID,
  type: 'kabem',
  isKotakKosong: true,
  enabled: true,
  number: '',
  name: 'Kotak Kosong',
  role: 'Tidak Memilih Paslon BEM',
  study: '',
  photo: '',
  tagline:
    'Dipilih apabila pemilih tidak berkenan memberikan suara kepada pasangan calon Ketua dan Wakil Ketua BEM FIK UI 2027.',
  visi: '',
  misi: [],
  programs: [],
}

export const ALL_CANDIDATES = [...AI_CANDIDATES, ...KABEM_CANDIDATES]

export const getCandidate = (id) =>
  id === KOTAK_KOSONG_ID ? DEFAULT_KOTAK_KOSONG : ALL_CANDIDATES.find((c) => c.id === id) || null

/** Konfigurasi tiap tahap pemilihan. */
export const VOTING_STEPS = {
  ai: {
    title: 'Voting Anggota Independen (AI)',
    subtitle: 'Pilih satu calon Anggota Independen yang Anda percaya mewakili aspirasi mahasiswa.',
    candidates: AI_CANDIDATES,
    selectionKey: 'aiId',
  },
  kabem: {
    title: 'Voting Ketua & Wakil Ketua BEM',
    subtitle: 'Pilih satu pasangan calon Ketua dan Wakil Ketua BEM periode berikutnya.',
    candidates: KABEM_CANDIDATES,
    selectionKey: 'kabemId',
  },
}

/** Tab SOP — masing-masing berisi 5 aturan. */
export const SOP_TABS = [
  {
    id: 'umum',
    label: 'Ketentuan Umum',
    description: 'Hak dan kewajiban pemilih dalam pemilihan raya mahasiswa.',
    rules: [
      'Hanya mahasiswa yang terdaftar dalam Daftar Pemilih Tetap (DPT) yang berhak memilih.',
      'Setiap pemilih hanya memiliki satu hak suara untuk setiap jenis pemilihan.',
      'Pemilihan bersifat langsung, umum, bebas, rahasia, jujur, dan adil (LUBER JURDIL).',
      'Pemilih wajib memilih secara pribadi dan dilarang diwakilkan kepada pihak lain.',
      'Pemilih dilarang memengaruhi atau memaksa pemilih lain dalam bentuk apa pun.',
    ],
  },
  {
    id: 'alur',
    label: 'Alur Pemilihan',
    description: 'Tahapan yang harus diikuti dari masuk hingga suara terkunci.',
    rules: [
      'Masuk menggunakan email atau nama lengkap serta NPM yang terdaftar di DPT.',
      'Pilih satu calon pada tahap Voting AI, kemudian satu pasangan pada Voting Kabem.',
      'Periksa kembali ringkasan pilihan Anda pada halaman Review sebelum melanjutkan.',
      'Minta kode OTP 6 digit yang dikirim ke email terdaftar, lalu masukkan pada kotak yang tersedia.',
      'Setelah OTP benar dan suara dikirim, pilihan tidak dapat diubah atau dibatalkan.',
    ],
  },
  {
    id: 'keamanan',
    label: 'Kerahasiaan Suara',
    description: 'Cara sistem menjaga kerahasiaan pilihan Anda.',
    rules: [
      'Identitas pemilih disimpan terpisah dari kotak suara dan tidak pernah digabungkan.',
      'Kotak suara hanya menyimpan pilihan, tanpa NPM, email, ataupun nama pemilih.',
      'Status "sudah memilih" hanya mencatat kehadiran, bukan pilihan Anda.',
      'Kode OTP berlaku singkat dan hanya dapat dipakai satu kali.',
      'Jangan membagikan kode OTP kepada siapa pun, termasuk panitia.',
    ],
  },
  {
    id: 'bantuan',
    label: 'Bantuan Teknis',
    description: 'Langkah jika Anda mengalami kendala saat memilih.',
    rules: [
      'Gunakan peramban versi terbaru dan pastikan koneksi internet stabil.',
      'Jika OTP belum masuk, periksa folder spam/promosi lalu kirim ulang setelah jeda 30 detik.',
      'Kode OTP kedaluwarsa dalam 3 menit; minta kode baru bila sudah habis.',
      'Jangan menutup halaman saat proses pengiriman suara berlangsung.',
      'Hubungi Panitia bila data Anda tidak ditemukan atau email terdaftar tidak aktif.',
    ],
  },
]

/** Jadwal pemilihan (contoh — sesuaikan dengan keputusan Panitia). */
export const ELECTION_TIMELINE = [
  { id: 'dpt', title: 'Penetapan DPT', date: '19 Okt 2026', status: 'done' },
  { id: 'kampanye', title: 'Masa Kampanye & Debat', date: '20 – 22 Okt 2026', status: 'done' },
  { id: 'voting', title: 'Masa Pemungutan Suara', date: '23 – 24 Okt 2026', status: 'active' },
  { id: 'rekap', title: 'Rekapitulasi Suara', date: '25 Okt 2026', status: 'upcoming' },
  { id: 'umum', title: 'Pengumuman Hasil', date: '26 Okt 2026', status: 'upcoming' },
]
