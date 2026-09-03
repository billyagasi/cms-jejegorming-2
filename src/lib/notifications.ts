import { Reservation } from '../types';

export type NotificationType =
  | 'Reservation_Created'
  | 'Step_Update'
  | 'Grooming_Completed'
  | 'Rescheduled';

export const createNotificationMessage = (
  res: Reservation,
  type: NotificationType,
  stepName?: string,
  pic?: string
): string => {
  const timeStr = res.timeSlot;
  const dateParts = res.date.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const formattedDate =
    dateParts.length === 3
      ? `${parseInt(dateParts[2])} ${months[parseInt(dateParts[1]) - 1]} ${dateParts[0]}`
      : res.date;

  switch (type) {
    case 'Reservation_Created':
      return `[WA] Halo ${res.ownerName}! Reservasi grooming untuk ${res.petName} (${res.petType} ${res.petBreed}) di Jeje Pet Care Grooming telah dikonfirmasi pada tanggal ${formattedDate} sesi ${timeStr}. Paket: ${res.packageType}. Estimasi biaya: Rp ${res.price.toLocaleString('id-ID')}. Terima kasih! 🐾`;

    case 'Rescheduled':
      return `[WA] Halo ${res.ownerName}! Reservasi grooming untuk ${res.petName} telah digeser jadwalnya menjadi tanggal ${formattedDate} sesi ${timeStr}. Mohon hubungi kami kembali jika jam baru ini kurang nyaman bagi Anda. Terima kasih! 🗓️`;

    case 'Step_Update':
      if (stepName?.includes('Step 1') || stepName?.includes('Check Up Vet Umum') || stepName === '1. Pemeriksaan (Sikat & Kesehatan)') {
        return `[WA] UPDATE GROOMING ${res.petName.toUpperCase()}: Sesi Check Up Vet Umum selesai oleh ${pic}. Kondisi fisik awal ${res.petName} dinyatakan aman! Selanjutnya masuk ke treatment kering. 🩺`;
      } else if (stepName?.includes('Step 2') || stepName?.includes('Treatment Kering')) {
        return `[WA] UPDATE GROOMING ${res.petName.toUpperCase()}: Sesi Treatment Kering selesai dikerjakan oleh ${pic}. Kuku dipotong rapi, telinga bersih, & bulu sikat rapi! Selanjutnya masuk ke proses mandi basah. ✂️`;
      } else if (stepName?.includes('Step 3') || stepName?.includes('Proses Mandi') || stepName === '2. Pemandian (Shampoo + Treatment)') {
        return `[WA] UPDATE GROOMING ${res.petName.toUpperCase()}: Sesi Mandi selesai dikerjakan oleh ${pic}. Bulunya diseka bersih dengan sampo premium, dipijat rileks, dan harum sekali! Selanjutnya masuk proses Pengeringan. 🛁`;
      } else if (stepName?.includes('Step 4') || stepName?.includes('Blowdry') || stepName === '3. Pengeringan & Blow Dry') {
        return `[WA] UPDATE GROOMING ${res.petName.toUpperCase()}: Selesai dikeringkan (Blow Dry) oleh ${pic}. Sekarang memasuki tahap re-check dan QC kelayakan terakhir. 💨`;
      } else {
        return `[WA] UPDATE GROOMING ${res.petName.toUpperCase()}: Tahap ${stepName} diperbarui oleh ${pic}. Progres berjalan lancar! ⭐`;
      }

    case 'Grooming_Completed':
      return `[WA] HORE! 🎉 Grooming ${res.petName} telah SELESAI 100%! ${res.petName} tampak sangat wangi, bersih, dan menawan diproses oleh tim kami. Resume catatan kesehatan & treatment bulu telah diterbitkan. Silakan jemput kesayangan Anda di Jeje Pet Care Grooming. Sampai jumpa! ❤️🐾`;

    default:
      return `[WA] Halo ${res.ownerName}, status grooming ${res.petName} telah diperbarui menjadi ${res.status}.`;
  }
};
