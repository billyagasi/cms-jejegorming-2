import { useCallback } from 'react';
import { Reservation, NotificationLog, NotificationLogType } from '../../types';
import { useReservations, useNotificationLogs, useAddNotificationLog } from '../../data-layer/hooks';
import { pushToast } from '../../components/ui/toastStore';

/**
 * Engine notifikasi WhatsApp simulasi — paritas dengan triggerNotification +
 * handleAddReservationsFromPortal aplikasi lama: pesan kolektif per pemilik,
 * dedupe, tulis log, dan toast.
 */
export function useNotificationEngine() {
  const { data: reservations = [] } = useReservations();
  const { data: logs = [] } = useNotificationLogs();
  const addLog = useAddNotificationLog();

  const buildCollectiveMessage = useCallback(
    (type: NotificationLogType, matches: Reservation[], resId: string): string => {
      if (type === 'Reservation_Created') {
        const petListDetails = matches
          .map(
            (r, index) =>
              `   ${index + 1}. 🐾 *${r.petName}* (${r.petType || 'Hewan'} ${r.petBreed || ''}) - Paket: ${r.packageType || '-'} - Sesi: ${r.timeSlot}`
          )
          .join('\n');
        const totalPrice = matches.reduce((sum, r) => sum + r.price, 0);
        return `[WA] NOTIFIKASI KOLEKTIF - PENERIMAAN RESERVASI 📱\n\nHalo Kak *${matches[0].ownerName}*!\nKami telah menerima & mengonfirmasi pendaftaran reservasi grooming untuk seluruh hewan kesayangan Anda:\n\n${petListDetails}\n\nTotal Estimasi Biaya Kolektif: *Rp ${totalPrice.toLocaleString('id-ID')}*\n\nTerima kasih banyak telah mempercayakan perawatan hewan kesayangan Anda di Jeje Pet Care! Kami tunggu kehadirannya sesuai sesi masing-masing. 🐾❤️`;
      }

      // Grooming_Completed
      const petListDetails = matches
        .map((r, index) => {
          let statusEmoji = '⏳';
          let statusLabel = 'Antrean / Sedang Diproses';
          if (r.id === resId || r.status === 'Completed') {
            statusEmoji = '✅';
            statusLabel = 'SELESAI 100% (Wangy, Bersih & Menawan!)';
          } else if (r.status === 'In_Progress') {
            statusEmoji = '🛁';
            statusLabel = 'Sedang Diproses Mandi/Blowdry';
          } else if (r.status === 'Cancelled') {
            statusEmoji = '❌';
            statusLabel = 'Dibatalkan';
          }
          return `   ${indexToLabel(index)} ${statusEmoji} *${r.petName}* (${r.petType || 'Hewan'}) -> Status: *${statusLabel}*`;
        })
        .join('\n');

      const note = matches.some((r) => r.id !== resId && r.status !== 'Completed' && r.status !== 'Cancelled')
        ? '💡 Catatan: Beberapa hewan masih dalam pengerjaan, Anda dapat menjemput sekaligus setelah semuanya selesai atau menjemput yang sudah berstatus SELESAI terlebih dahulu.'
        : '🎉 Kabar Baik: Seluruh hewan kesayangan Anda telah selesai di-grooming! Silakan datang ke Jeje Pet Care untuk penjemputan.';

      return `[WA] NOTIFIKASI KOLEKTIF - STATUS GROOMING HEWAN 📱\n\nHalo Kak *${matches[0].ownerName}*!\nBerikut adalah update status perkembangan grooming kolektif untuk seluruh hewan kesayangan Anda hari ini:\n\n${petListDetails}\n\n${note}\n\nTerima kasih banyak! ❤️🐾`;
    },
    []
  );

  const triggerNotification = useCallback(
    (
      resId: string,
      petName: string,
      ownerName: string,
      phone: string,
      type: NotificationLogType,
      stepName?: string
    ) => {
      if (type !== 'Reservation_Created' && type !== 'Grooming_Completed') return;

      const matching = reservations.filter((r) => r.ownerPhone === phone && r.status !== 'Cancelled');
      const uniqueMatches = matching.some((r) => r.id === resId)
        ? Array.from(new Map(matching.map((m) => [m.id, m])).values())
        : Array.from(
            new Map(
              [
                ...matching,
                {
                  id: resId,
                  petName,
                  ownerName,
                  ownerPhone: phone,
                  packageType: 'Grooming',
                  price: 0,
                  date: new Date().toISOString().split('T')[0],
                  timeSlot: '09:00 - 10:00',
                  status: 'Waiting',
                } as Reservation,
              ].map((m) => [m.id, m])
            ).values()
          );

      const finalMessage = buildCollectiveMessage(type, uniqueMatches, resId);

      // Dedupe: skip bila pesan identik sudah pernah terkirim
      if (logs.some((l) => l.message === finalMessage)) return;

      const newLog: NotificationLog = {
        id: `notif-${Math.floor(100000 + Math.random() * 900000)}`,
        reservationId: resId,
        petName: uniqueMatches.map((r) => r.petName).join(', '),
        ownerName,
        ownerPhone: phone,
        type,
        stepName: stepName || '',
        message: finalMessage,
        timestamp: new Date().toISOString(),
        channel: 'WhatsApp',
        status: 'Delivered',
      };

      addLog.mutate(newLog);
      pushToast({
        tone: 'wa',
        title: 'Notifikasi WhatsApp (Simulasi)',
        message: finalMessage,
        duration: 6500,
      });
    },
    [reservations, logs, addLog, buildCollectiveMessage]
  );

  /** Notifikasi kolektif khusus reservasi portal mandiri (multi-hewan baru). */
  const notifyPortalBooking = useCallback(
    (newBookings: Reservation[]) => {
      if (newBookings.length === 0) return;
      const first = newBookings[0];
      const petListDetails = newBookings
        .map(
          (r, index) =>
            `   ${indexToLabel(index)} 🐾 *${r.petName}* (${r.petType || 'Hewan'} ${r.petBreed || ''}) - Paket: ${r.packageType || '-'} - Sesi: ${r.timeSlot}`
        )
        .join('\n');
      const totalPrice = newBookings.reduce((sum, r) => sum + r.price, 0);
      const collectiveMessage = `[WA] NOTIFIKASI KOLEKTIF - PENERIMAAN RESERVASI MANDIRI 📱\n\nHalo Kak *${first.ownerName}*!\nKami telah menerima & mengonfirmasi pendaftaran reservasi grooming mandiri untuk seluruh hewan kesayangan Anda:\n\n${petListDetails}\n\nTotal Estimasi Biaya Kolektif: *Rp ${totalPrice.toLocaleString('id-ID')}*\n\nTerima kasih banyak telah mempercayakan perawatan hewan kesayangan Anda di Jeje Pet Care! Kami tunggu kehadirannya sesuai sesi masing-masing. 🐾❤️`;

      const newLog: NotificationLog = {
        id: `notif-${Math.floor(100000 + Math.random() * 900000)}`,
        reservationId: first.id,
        petName: newBookings.map((r) => r.petName).join(', '),
        ownerName: first.ownerName,
        ownerPhone: first.ownerPhone,
        type: 'Reservation_Created',
        stepName: '',
        message: collectiveMessage,
        timestamp: new Date().toISOString(),
        channel: 'WhatsApp',
        status: 'Delivered',
      };

      addLog.mutate(newLog);
      pushToast({
        tone: 'wa',
        title: 'Notifikasi WhatsApp (Simulasi)',
        message: collectiveMessage,
        duration: 6500,
      });
    },
    [addLog]
  );

  return { triggerNotification, notifyPortalBooking };
}

function indexToLabel(index: number): string {
  return `${index + 1}.`;
}