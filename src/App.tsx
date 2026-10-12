import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from './app/store';
import { useAppConfig, useSaveReservation, useAddActivityLog } from './data-layer/hooks';
import { applyBrandTheme } from './lib/theme';
import Header from './app/Header';
import Sidebar from './app/Sidebar';
import GuestTabSwitcher from './app/GuestTabSwitcher';
import StaffLoginModal from './app/StaffLoginModal';
import TabRouter from './app/TabRouter';
import ToastHost from './components/ui/Toast';
import AddEditReservationModal from './features/reservation-form/AddEditReservationModal';
import ResumeGroomingModal from './features/resume/ResumeGroomingModal';
import { useNotificationEngine } from './features/notifications/useNotificationEngine';
import { Reservation } from './types';
import { pushToast } from './components/ui/toastStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Shell() {
  const isDarkMode = useAppStore((s) => s.isDarkMode);
  const session = useAppStore((s) => s.session);
  const { data: config } = useAppConfig();
  const saveReservation = useSaveReservation();
  const addActivityLog = useAddActivityLog();
  const { triggerNotification } = useNotificationEngine();
  const [isStaffLoginOpen, setIsStaffLoginOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [resumeReservation, setResumeReservation] = useState<Reservation | null>(null);
  const [addPrefill, setAddPrefill] = useState<{ date?: string; slot?: string } | undefined>(undefined);

  const openAddReservation = (date?: string, slot?: string) => {
    setSelectedReservation(null);
    setAddPrefill(date ? { date, slot } : undefined);
    setIsAddModalOpen(true);
  };

  const openEditReservation = (res: Reservation | null) => {
    setSelectedReservation(res);
    setAddPrefill(undefined);
    setIsAddModalOpen(true);
  };

  const openResumeModal = (res: Reservation) => {
    setResumeReservation(res);
    setIsResumeModalOpen(true);
  };

  // Dark mode -> class html.dark
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Tema brand dari konfigurasi master
  useEffect(() => {
    if (config?.activeTheme) applyBrandTheme(config.activeTheme);
  }, [config?.activeTheme]);

  const handleSaveReservation = (payload: Reservation) => {
    const isNew = !selectedReservation?.id;
    saveReservation.mutate(payload, {
      onSuccess: () => {
        if (isNew) {
          triggerNotification(payload.id, payload.petName, payload.ownerName, payload.ownerPhone, 'Reservation_Created');
        }
        addActivityLog.mutate({
          id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          staffName: session?.username || 'Pelanggan / Mandiri',
          role: session?.role || 'Sistem',
          action: isNew ? 'Tambah Reservasi' : 'Edit Reservasi',
          timestamp: new Date().toISOString(),
          targetId: payload.id,
          targetName: payload.petName,
          details: `${isNew ? 'Reservasi baru dibuat' : 'Reservasi diedit'} untuk ${payload.petName} (${payload.ownerName}) — Paket ${payload.packageType}, ${payload.date} ${payload.timeSlot}`,
        });
        pushToast({
          tone: 'success',
          title: isNew ? 'Reservasi Dibuat' : 'Reservasi Diperbarui',
          message: `${payload.petName} — ${payload.packageType}`,
        });
      },
      onError: (err) => {
        pushToast({ tone: 'error', title: 'Gagal Menyimpan', message: String(err) });
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 dark:bg-slate-950">
      {/* Sidebar staf — null saat guest, jadi hanya dirender setelah login */}
      <Sidebar onClose={() => useAppStore.getState().setNavMenuOpen(false)} />

      {/* Konten bergeser di desktop hanya saat staf login (sidebar persisten) */}
      <div className={`flex min-h-screen flex-col ${session ? 'lg:pl-72' : ''}`}>
        <Header
          onOpenStaffLogin={() => setIsStaffLoginOpen(true)}
          onOpenAddReservation={() => openAddReservation()}
        />
        {/* Switcher layanan untuk guest: Grooming | Layanan Khusus | Cek Status */}
        <GuestTabSwitcher />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          <TabRouter
            onOpenStaffLogin={() => setIsStaffLoginOpen(true)}
            onOpenAddReservation={openAddReservation}
            onOpenEditReservation={openEditReservation}
            onOpenResume={openResumeModal}
          />
        </main>
        <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] text-slate-400">
            JPC Grooming Hub — Sistem Manajemen Pet Care · Phase 1 Rewrite
          </p>
        </footer>
      </div>

      <StaffLoginModal isOpen={isStaffLoginOpen} onClose={() => setIsStaffLoginOpen(false)} />
      <AddEditReservationModal
        isOpen={isAddModalOpen}
        reservation={selectedReservation}
        prefillDate={addPrefill?.date}
        prefillSlot={addPrefill?.slot}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedReservation(null);
          setAddPrefill(undefined);
        }}
        onSave={handleSaveReservation}
      />
      <ResumeGroomingModal
        isOpen={isResumeModalOpen}
        reservation={resumeReservation}
        onClose={() => {
          setIsResumeModalOpen(false);
          setResumeReservation(null);
        }}
      />
      <ToastHost />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Shell />
    </QueryClientProvider>
  );
}
