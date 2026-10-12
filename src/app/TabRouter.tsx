import { useAppStore } from '../app/store';
import { PUBLIC_TABS } from './tabs';
import { useRbac } from './useRbac';
import FeaturePlaceholder from '../features/placeholder/FeaturePlaceholder';
import PortalPage from '../features/portal';
import AppointmentPortal from '../features/appointment/AppointmentPortal';
import AppointmentManager from '../features/appointment/AppointmentManager';
import InpatientManager from '../features/inpatients/InpatientManager';
import PublicTracker from '../features/public-tracker/PublicTracker';
import QueuePage from '../features/queue/QueuePage';
import GroomingStepsManager from '../features/steps/GroomingStepsManager';
import ScheduleKalender from '../features/schedule/ScheduleKalender';
import KalenderReminder from '../features/reminder/KalenderReminder';
import NotificationLogDashboard from '../features/notification-logs/NotificationLogDashboard';
import ActivityLogDashboard from '../features/activity-logs/ActivityLogDashboard';
import POSGroomingDashboard from '../features/pos/POSGroomingDashboard';
import InventoryManager from '../features/inventory/InventoryManager';
import SetupManualDashboard from '../features/setup/SetupManualDashboard';
import ReportsPage from '../features/reports/ReportsPage';
import OwnerMedicalProfile from '../features/profile/OwnerMedicalProfile';
import type { Reservation } from '../types';

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

  switch (currentTab) {
    case 'portal':
      return <PortalPage />;
    case 'appointment':
      return <AppointmentPortal />;
    case 'tracker':
      return <PublicTracker />;
    case 'appointments':
      return <AppointmentManager />;
    case 'inpatients':
      return <InpatientManager />;
    case 'queue':
      return (
        <QueuePage
          onEditReservation={(res) => (res ? onOpenEditReservation?.(res) : onOpenAddReservation?.())}
          onOpenResume={(res) => onOpenResume?.(res)}
        />
      );
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
  }
}
