# Benchmark Flow JPC Electronic Medical Record → CMS JejeGorming

Dokumen ini memetakan pola yang direuse dari `JPC-Electronic-Medical-Record-main` ke frontend terpusat `cms-jejegorming-2`. Implementasi tidak menyalin tampilan mentah; pola operasionalnya disederhanakan agar konsisten dengan design system CMS dan data layer lokal yang sudah ada.

## Alur end-to-end

1. Pelanggan memilih layanan khusus, dokter, jadwal, pasien, anamnesa, dan memberi persetujuan.
2. Booking masuk ke Command Center Klinik sebagai **Menunggu Verifikasi**.
3. Staf mengonfirmasi booking; sistem mencatat waktu konfirmasi dan log WhatsApp simulasi.
4. Saat pasien datang, staf melakukan **Check-in** dan sistem memberi nomor antrean per tanggal.
5. Dokter membuka detail pasien, melengkapi pertanyaan pra-kunjungan, diagnosis, tindakan, obat, serta catatan internal.
6. Tindakan dan obat membentuk bill; item inventaris yang tertaut dipotong ketika bill ditutup.
7. Bill ditutup, appointment menjadi selesai, invoice dan resume medis dapat dicetak.
8. Bila perlu hospitalisasi, pasien diteruskan ke Rawat Inap dengan data appointment terisi otomatis.
9. Riwayat diagnosis tampil di Rekam & Profil serta portal Cek Status & Rekam Medis tanpa akun.

## Mapping fitur

| Referensi RME | Implementasi CMS | Status |
|---|---|---|
| `Reservations.tsx` — registrasi mandiri bertahap | `AppointmentPortal.tsx` — 7 langkah registrasi layanan khusus | Reuse + improve |
| `ReservationsAdmin.tsx` — verifikasi reservasi | Command Center: Menunggu Verifikasi → Terkonfirmasi | Implemented |
| `ReservationsAdmin.tsx` — antrean kunjungan | Check-in dan nomor antrean `A-001` per tanggal | Implemented |
| Filter reservasi harian/mingguan | Mode Harian, Mingguan, Semua + navigasi periode | Implemented |
| Statistik pending/confirmed/completed | Statistik kunjungan, verifikasi, konfirmasi, pemeriksaan | Implemented |
| Ambulator / rekam medis | Diagnosis, anamnesa, pertanyaan pra-kunjungan, tindakan, obat | Integrated |
| Cetak rekam medis | Resume medis PDF per pasien | Implemented |
| Billing tindakan | Biaya layanan + tindakan + obat + pembayaran | Improved |
| Inventaris medis | Potong stok saat bill ditutup | Existing, reused |
| Handoff ke Rawat Inap | Tombol “Lanjut Rawat Inap” dengan prefill appointment/pasien | Integrated |
| Monitoring Rawat Inap | Catatan berkala, suhu, terapi, penggunaan inventaris | Existing, reused |
| Riwayat pemilik/pasien | Timeline gabungan grooming dan appointment | Existing, reused |
| Status publik | Progress booking, nomor antrean, diagnosis, rawat inap | Improved |
| Notification trigger | Log WhatsApp saat booking, konfirmasi, dan check-in | Integrated (simulasi frontend) |

## Batas fase frontend

- Data dan lifecycle disimpan melalui repository frontend/local storage yang sudah digunakan CMS.
- WhatsApp masih berupa simulasi dan notification log; belum mengirim melalui provider eksternal.
- Nomor antrean dibuat di browser. Backend kelak perlu menjamin atomic sequence saat banyak perangkat check-in bersamaan.
- Otorisasi, sinkronisasi multi-device, audit server, dan penyimpanan permanen tetap menjadi scope backend berikutnya.
