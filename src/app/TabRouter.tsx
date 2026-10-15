import { lazy, Suspense } from 'react';
import { useAppStore } from '../app/store';
import { PUBLIC_TABS } from './tabs';
import { useRbac } from './useRbac';
import FeaturePlaceholder from '../features/placeholder/FeaturePlaceholder';
import type { Reservation } from '../types';

const PortalPage = lazy(() => import('../features/portal'));
const AppointmentPortal = lazy(() => import('../features/appointment/AppointmentPortal'));
const InpatientManager = lazy(() => import('../features/inpatients/InpatientManager'));
const PublicTracker = lazy(() => import('../features/public-tracker/PublicTracker'));
const UnifiedCommandCenter = lazy(() => import('../features/queue/UnifiedCommandCenter'));
const QueueDisplay = lazy(() => import('../features/queue/QueueDisplay'));
const SurgeryManager = lazy(() => import('../features/surgery/SurgeryManager'));
const VaccinationManager = lazy(() => import('../features/vaccination/VaccinationManager'));
const GroomingStepsManager = lazy(() => import('../features/steps/GroomingStepsManager'));
const ScheduleKalender = lazy(() => import('../features/schedule/ScheduleKalender'));
const KalenderReminder = lazy(() => import('../features/reminder/KalenderReminder'));
const NotificationLogDashboard = lazy(() => import('../features/notification-logs/NotificationLogDashboard'));
const ActivityLogDashboard = lazy(() => import('../features/activity-logs/ActivityLogDashboard'));
const POSGroomingDashboard = lazy(() => import('../features/pos/POSGroomingDashboard'));
const InventoryManager = lazy(() => import('../features/inventory/InventoryManager'));
const SetupManualDashboard = lazy(() => import('../features/setup/SetupManualDashboard'));
const ReportsPage = lazy(() => import('../features/reports/ReportsPage'));
const OwnerMedicalProfile = lazy(() => import('../features/profile/OwnerMedicalProfile'));

interface TabRouterProps {
  onOpenStaffLogin: () => void;
  /** Buka modal reservasi baru; opsional dengan prefill tanggal+slot dari kalender */
  onOpenAddReservation?: (date?: string, slot?: string) => void;
  onOpenEditReservation?: (res: Reservation) => void;
  onOpenResume?: (res: Reservation) => void;
}

export default function TabRouter({
  onOpenStaffLogin,
  onOpenAddReservation,
  onOpenEditReservation,
  onOpenResume,
}: TabRouterProps) {
  const currentTab = useAppStore((s) => s.currentTab);
  const { isAuthenticated, isTabAllowed } = useRbac();

  // Tab non-publik wajib login backoffice
  if (!isAuthenticated && !PUBLIC_TABS.includes(currentTab)) {
    return <FeaturePlaceholder title="Akses BackOffice Diperlukan" />;
  }
  if (isAuthenticated && !isTabAllowed(currentTab)) {
    return <FeaturePlaceholder title="Akses Ditutup" />;
  }

  const renderTab = () => { switch (currentTab) {
    case 'portal':
      return <PortalPage />;
    case 'appointment':
      return <AppointmentPortal />;
    case 'tracker':
      return <PublicTracker />;
    case 'appointments':
      return <UnifiedCommandCenter initialMode="clinic" onEditReservation={(res) => (res ? onOpenEditReservation?.(res) : onOpenAddReservation?.())} onOpenResume={(res) => onOpenResume?.(res)} />;
    case 'inpatients':
      return <InpatientManager />;
    case 'queue':
      return (
        <UnifiedCommandCenter
          onEditReservation={(res) => (res ? onOpenEditReservation?.(res) : onOpenAddReservation?.())}
          onOpenResume={(res) => onOpenResume?.(res)}
        />
      );
    case 'queueDisplay':
      return <QueueDisplay />;
    case 'surgeries':
      return <SurgeryManager />;
    case 'vaccinations':
      return <VaccinationManager />;
    case 'steps':
      return <GroomingStepsManager onOpenResume={(res) => onOpenResume?.(res)} />;
    case 'scheduler':
      return (
        <ScheduleKalender
          onOpenEditReservation={(res) => onOpenEditReservation?.(res)}
          onOpenResume={(res) => onOpenResume?.(res)}
          onOpenAddWithSlot={(date, slot) => onOpenAddReservation?.(date, slot)}
        />
      );
    case 'reminder':
      return <KalenderReminder />;
    case 'logs':
      return <NotificationLogDashboard />;
    case 'activityLogs':
      return <ActivityLogDashboard />;
    case 'pos':
      return <POSGroomingDashboard />;
    case 'inventaris':
      return <InventoryManager />;
    case 'profile':
      return (
        <OwnerMedicalProfile
          onOpenResume={(res) => onOpenResume?.(res)}
          onOpenEditReservation={(res) => (res ? onOpenEditReservation?.(res) : onOpenAddReservation?.())}
        />
      );
    case 'setup':
      return <SetupManualDashboard onEditReservation={(res) => (res ? onOpenEditReservation?.(res) : onOpenAddReservation?.())} />;
    case 'laporan':
      return <ReportsPage />;
    default:
      return <FeaturePlaceholder title="Modul dalam pengerjaan" />;
  }};

  return <Suspense fallback={<div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900">Memuat modul…</div>}>{renderTab()}</Suspense>;
}
