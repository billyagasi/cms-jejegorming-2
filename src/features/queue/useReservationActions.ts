import { useCallback } from 'react';
import { Reservation, GroomingStep, ResumeGrooming, SelectedAddOn, ReservationMaterial } from '../../types';
import { useReservations, useSaveReservation, useDeleteReservation, useAddActivityLog, useInventory, useSaveInventoryItem } from '../../data-layer/hooks';
import { useAppStore } from '../../app/store';
import { useNotificationEngine } from '../notifications/useNotificationEngine';
import { pushToast } from '../../components/ui/toastStore';

/** Mutasi reservasi + notifikasi + audit — paritas handler App lama. */
export function useReservationActions() {
  const { data: reservations = [] } = useReservations();
  const saveReservation = useSaveReservation();
  const deleteReservation = useDeleteReservation();
  const addActivityLog = useAddActivityLog();
  const { data: inventory = [] } = useInventory();
  const saveInventory = useSaveInventoryItem();
  const { triggerNotification } = useNotificationEngine();
  const session = useAppStore((s) => s.session);

  /**
   * Terapkan delta pemakaian material grooming ke stok Inventaris.
   * Delta = (pemakaian baru) − (snapshot lama) — aman dari double-deduction.
   */
  const applyMaterialDeltas = useCallback(
    (prev: ReservationMaterial[] | undefined, next: ReservationMaterial[]) => {
      const deltas = new Map<string, number>();
      (prev || []).forEach((m) => {
        if (!m.itemId) return;
        deltas.set(m.itemId, (deltas.get(m.itemId) || 0) - m.quantity);
      });
      next.forEach((m) => {
        if (!m.itemId) return;
        deltas.set(m.itemId, (deltas.get(m.itemId) || 0) + m.quantity);
      });
      deltas.forEach((delta, itemId) => {
        if (delta === 0) return;
        const inv = inventory.find((i) => i.id === itemId);
        if (!inv) return;
        saveInventory.mutate({ ...inv, stock: Math.max(0, inv.stock - delta), lastUpdated: new Date().toISOString().split('T')[0] });
      });
    },
    [inventory, saveInventory]
  );

  const log = useCallback(
    (action: string, targetId: string, targetName: string, details: string) => {
      addActivityLog.mutate({
        id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        staffName: session?.username || 'Pelanggan / Mandiri',
        role: session?.role || 'Sistem',
        action,
        timestamp: new Date().toISOString(),
        targetId,
        targetName,
        details,
      });
    },
    [addActivityLog, session]
  );

  /** Waiting → In_Progress; step 1 jadi ongoing + notifikasi. */
  const startGrooming = useCallback(
    (id: string) => {
      const target = reservations.find((r) => r.id === id);
      if (!target) return;
      const nextSteps = target.steps.map((step, i) =>
        i === 0 ? { ...step, status: 'ongoing' as const, updatedAt: new Date().toISOString() } : step
      );
      saveReservation.mutate(
        { ...target, status: 'In_Progress', steps: nextSteps },
        {
          onSuccess: () => {
            log('Mulai Grooming', id, target.petName, `Sesi grooming dimulai untuk ${target.petName} (${target.ownerName})`);
            triggerNotification(id, target.petName, target.ownerName, target.ownerPhone, 'Step_Update', nextSteps[0].name);
          },
        }
      );
    },
    [reservations, saveReservation, log, triggerNotification]
  );

  /** Tandai dibatalkan + pesan WA pembatalan. */
  const cancelReservation = useCallback(
    (id: string) => {
      const target = reservations.find((r) => r.id === id);
      if (!target) return;
      saveReservation.mutate(
        { ...target, status: 'Cancelled' },
        {
          onSuccess: () => {
            log('Batal Reservasi', id, target.petName, `Membatalkan reservasi grooming untuk hewan ${target.petName} (Pemilik: ${target.ownerName})`);
            pushToast({
              tone: 'wa',
              title: 'Konfirmasi Pembatalan (Simulasi)',
              message: `[WA] Halo ${target.ownerName}, kami mengonfirmasi pembatalan reservasi grooming untuk ${target.petName} pada ${target.date}. Hubungi kami jika ingin menjadwalkan ulang. Terima kasih. 🐾`,
            });
          },
        }
      );
    },
    [reservations, saveReservation, log]
  );

  const removeReservation = useCallback(
    (id: string) => {
      const target = reservations.find((r) => r.id === id);
      deleteReservation.mutate(id, {
        onSuccess: () => {
          if (target) {
            log('Hapus Reservasi', id, target.petName, `Menghapus data reservasi untuk hewan ${target.petName} (Pemilik: ${target.ownerName})`);
          }
          pushToast({ tone: 'success', title: 'Reservasi Dihapus' });
        },
      });
    },
    [reservations, deleteReservation, log]
  );

  /** Update status satu step; recompute status keseluruhan + auto resume + notifikasi. */
  const updateStepStatus = useCallback(
    (resId: string, stepId: string, newStatus: GroomingStep['status']) => {
      const target = reservations.find((r) => r.id === resId);
      if (!target) return;
      const nextSteps = target.steps.map((step) =>
        step.id === stepId ? { ...step, status: newStatus, updatedAt: new Date().toISOString() } : step
      );

      let overall: Reservation['status'] = target.status;
      const allDone = nextSteps.every((s) => s.status === 'completed');
      const anyOngoing = nextSteps.some((s) => s.status === 'ongoing');
      if (allDone) overall = 'Completed';
      else if (anyOngoing || nextSteps.some((s) => s.status === 'completed')) overall = 'In_Progress';

      // Auto-inject resume default saat seluruh step selesai & belum ada resume
      let resume = target.resume;
      if (allDone && !resume) {
        resume = {
          weight: undefined,
          skinCondition: 'Bersih & sehat',
          hairCondition: 'Sehat berkilau',
          earCondition: 'Bersih',
          nailCondition: 'Sudah digunting rapi',
          groomingNotes: 'Seluruh tahapan grooming telah diselesaikan sesuai SOP.',
          recommendations: 'Disarankan grooming rutin kembali 3-4 minggu berikutnya.',
        };
      }

      saveReservation.mutate(
        { ...target, status: overall, steps: nextSteps, ...(resume ? { resume } : {}) },
        {
          onSuccess: () => {
            const stepName = target.steps.find((s) => s.id === stepId)?.name;
            log('Update Tindakan', resId, target.petName, `Step "${stepName}" → ${newStatus} untuk ${target.petName}`);
            if (allDone) {
              triggerNotification(resId, target.petName, target.ownerName, target.ownerPhone, 'Grooming_Completed');
            } else {
              triggerNotification(resId, target.petName, target.ownerName, target.ownerPhone, 'Step_Update', stepName, );
            }
          },
        }
      );
    },
    [reservations, saveReservation, log, triggerNotification]
  );

  const updateStepPic = useCallback(
    (resId: string, stepId: string, newPic: string) => {
      const target = reservations.find((r) => r.id === resId);
      if (!target) return;
      const nextSteps = target.steps.map((step) => (step.id === stepId ? { ...step, pic: newPic } : step));
      saveReservation.mutate({ ...target, steps: nextSteps });
    },
    [reservations, saveReservation]
  );

  const updateTransportMode = useCallback(
    (resId: string, newMode: string) => {
      const target = reservations.find((r) => r.id === resId);
      if (!target) return;
      saveReservation.mutate({ ...target, transportMode: newMode });
    },
    [reservations, saveReservation]
  );

  /** Simpan resume grooming + revisi harga/paket/addOn/foto + material terpakai (paritas handleSaveResume). */
  const saveResume = useCallback(
    (
      resId: string,
      resumeBody: ResumeGrooming,
      newPrice?: number,
      photoUrl?: string,
      newAddOns?: SelectedAddOn[],
      newPackageType?: string,
      newMaterials?: ReservationMaterial[]
    ) => {
      const target = reservations.find((r) => r.id === resId);
      if (!target) return;
      const payload: Reservation = {
        ...target,
        resume: resumeBody,
        ...(newPrice !== undefined ? { price: newPrice } : {}),
        ...(photoUrl !== undefined ? { photoUrl } : {}),
        ...(newAddOns ? { addOns: newAddOns } : {}),
        ...(newPackageType ? { packageType: newPackageType } : {}),
        ...(newMaterials ? { materialsUsed: newMaterials } : {}),
      };
      // Delta stok material (sebelum update snapshot di reservation)
      if (newMaterials) {
        applyMaterialDeltas(target.materialsUsed, newMaterials);
      }
      saveReservation.mutate(payload, {
        onSuccess: () => {
          log('Simpan Resume', resId, target.petName, `Resume grooming diterbitkan untuk ${target.petName}`);
          triggerNotification(resId, target.petName, target.ownerName, target.ownerPhone, 'Grooming_Completed');
          pushToast({ tone: 'success', title: 'Resume Tersimpan', message: `Resume grooming ${target.petName} berhasil diterbitkan.` });
        },
      });
    },
    [reservations, saveReservation, log, triggerNotification, applyMaterialDeltas]
  );

  return { startGrooming, cancelReservation, removeReservation, updateStepStatus, updateStepPic, updateTransportMode, saveResume };
}