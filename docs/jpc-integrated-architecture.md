# Arsitektur Integrasi JPC RME → Pet Care Hub

## Prinsip produk

CMS ini menjadi aplikasi utama. Fitur dari `JPC-Electronic-Medical-Record-main` tidak dipasang sebagai aplikasi atau menu paralel. Setiap kapabilitas masuk ke alur yang sudah dimiliki CMS:

- Antrean grooming dan klinik memakai satu **Command Center Operasional**.
- Kalender grooming dan klinik memakai satu **Kalender Operasional** dengan mode konteks.
- Reminder grooming, booster, rawat jalan, rawat inap, dan pascaoperasi memakai satu **Reminder & Follow-up**.
- Semua kejadian klinis muncul pada satu **Rekam Medis & Profil** pasien.
- Operasi, vaksinasi, appointment, rawat inap, POS, dan grooming memakai inventaris dan audit log yang sama.
- Pesan otomatis dan manual memakai satu **Notification Center**.

## Domain data frontend

| Domain | Storage key lokal | Endpoint API fase backend |
|---|---|---|
| Appointment | `jpc_appointments` | `/api/appointments` |
| Rawat inap | `jpc_inpatients` | `/api/inpatients` |
| Operasi | `jpc_surgeries` | `/api/surgeries` |
| Vaksinasi | `jpc_vaccinations` | `/api/vaccinations` |
| Follow-up klinis | `jpc_clinical_follow_ups` | `/api/clinical-follow-ups` |
| Inventaris | `jeje_cached_inventory` | `/api/inventory` |
| Notifikasi | `jeje_cached_logs` | `/api/logs` |
| Audit staf | `jeje_cached_activityLogs` | `/api/activity-logs` |

UI hanya mengakses data melalui TanStack Query hooks dan `AppRepository`. Peralihan dari localStorage ke backend tidak boleh mengubah komponen fitur.

## Relasi lintas fitur

1. Appointment dikonfirmasi lalu check-in dan mendapat nomor antrean.
2. Pemeriksaan menyimpan vital, pemeriksaan fisik, diagnosis, resep, tindakan, dan lampiran.
3. Bill ditutup dan item inventaris yang tertaut dipotong.
4. Pasien dapat diteruskan ke Rawat Inap atau dijadwalkan untuk Operasi.
5. Operasi dapat memakai anestesi/BMHP dari inventaris dan diteruskan ke ruang pemulihan Rawat Inap.
6. Vaksinasi dapat memotong stok dan otomatis membuat follow-up booster.
7. Semua kejadian tersebut digabung pada profil pasien dan Kalender Operasional.

## Batas keamanan frontend

Timeout inaktivitas staf, RBAC tab, audit, dan validasi stok sudah diterapkan untuk UX frontend. Ini bukan pengganti enforcement backend. Backend produksi wajib menangani:

- autentikasi dengan password hash, token aman, rotasi sesi, dan revocation;
- otorisasi per aksi, bukan hanya visibilitas menu;
- transaksi atomik untuk nomor antrean, stok, bill, serta pemakaian BMHP;
- object storage terenkripsi untuk lampiran medis;
- audit append-only dan retensi data;
- optimistic concurrency/versioning untuk perubahan dari banyak perangkat;
- adapter provider WhatsApp/SMS/email dan webhook delivery status.

## Aturan pengembangan berikutnya

- Jangan membuat halaman kedua jika domain sudah punya rumah pada navigasi utama.
- Jangan mengakses localStorage langsung dari fitur baru; perluas `AppRepository` dan hooks.
- Setiap mutasi klinis material wajib menulis audit log.
- Pemakaian stok hanya dikomit sekali dan ditandai timestamp komit.
- Data pasien lintas fitur dicocokkan melalui snapshot identitas saat ini; backend harus menggantinya dengan `patientId` dan `ownerId` kanonis.
