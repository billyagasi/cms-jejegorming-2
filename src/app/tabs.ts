import {
  DoorOpen,
  ShoppingBag,
  ListChecks,
  Layers,
  Calendar,
  BellRing,
  BookOpen,
  MessageSquare,
  Database,
  BarChart3,
  Package,
  History,
  Stethoscope,
  BedDouble,
  SearchCheck,
  type LucideIcon,
} from 'lucide-react';
import type { TabId } from '../app/store';

export interface TabDef {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

export interface TabGroup {
  label: string;
  tabs: TabDef[];
}

export const TAB_GROUPS: TabGroup[] = [
  {
    label: 'Beranda',
    tabs: [
      { id: 'portal', label: 'Reservasi Mandiri', icon: DoorOpen },
      { id: 'appointment', label: 'Appointment Dokter', icon: Stethoscope },
      { id: 'tracker', label: 'Cek Status & Rekam Medis', icon: SearchCheck },
      { id: 'pos', label: 'POS Kasir', icon: ShoppingBag },
    ],
  },
  {
    label: 'Antrean & Proses',
    tabs: [
      { id: 'queue', label: 'Antrean', icon: ListChecks },
      { id: 'appointments', label: 'Appointment Klinik', icon: Stethoscope },
      { id: 'inpatients', label: 'Rawat Inap', icon: BedDouble },
      { id: 'steps', label: 'Tindakan (5-Step)', icon: Layers },
      { id: 'scheduler', label: 'Kalender Sesi', icon: Calendar },
      { id: 'reminder', label: 'Reminder', icon: BellRing },
    ],
  },
  {
    label: 'Rekam Medis',
    tabs: [
      { id: 'profile', label: 'Rekam & Profil', icon: BookOpen },
      { id: 'logs', label: 'Log WhatsApp', icon: MessageSquare },
    ],
  },
  {
    label: 'Repository',
    tabs: [
      { id: 'setup', label: 'Database Master', icon: Database },
      { id: 'laporan', label: 'Keuangan & Komisi', icon: BarChart3 },
      { id: 'inventaris', label: 'Inventaris Stok', icon: Package },
      { id: 'activityLogs', label: 'Log Aktivitas', icon: History },
    ],
  },
];

export const TAB_LABELS: Record<TabId, string> = Object.fromEntries(
  TAB_GROUPS.flatMap((g) => g.tabs.map((t) => [t.id, t.label]))
) as Record<TabId, string>;

/** Tab yang bisa diakses tanpa login backoffice */
export const PUBLIC_TABS: TabId[] = ['portal', 'appointment', 'tracker'];
