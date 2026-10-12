import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRepository } from '.';
import {
  Reservation,
  NotificationLog,
  InventoryItem,
  StaffActivityLog,
  POSGroomingTransaction,
  AppConfig,
  WhatsAppTemplate,
  Appointment,
  Inpatient,
} from '../types';

/**
 * TanStack Query hooks — satu-satunya pintu akses data dari UI.
 * Phase 2: SSE dari backend Gin akan memanggil invalidasi query key yang sama.
 */

export const queryKeys = {
  reservations: ['reservations'] as const,
  appointments: ['appointments'] as const,
  inpatients: ['inpatients'] as const,
  logs: ['logs'] as const,
  inventory: ['inventory'] as const,
  activityLogs: ['activity-logs'] as const,
  posTransactions: ['pos-transactions'] as const,
  config: ['config'] as const,
  waTemplates: ['wa-templates'] as const,
};

// --- Reservasi ---

export function useReservations() {
  return useQuery({
    queryKey: queryKeys.reservations,
    queryFn: async () => {
      const list = await getRepository().getReservations();
      return sortDescBy(list, (r) => r.createdAt);
    },
  });
}

export function useSaveReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (res: Reservation) => getRepository().saveReservation(res),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.reservations }),
  });
}

export function useSaveReservations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (list: Reservation[]) => getRepository().saveReservations(list),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.reservations }),
  });
}

export function useDeleteReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getRepository().deleteReservation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.reservations }),
  });
}

// --- Appointment klinik ---

export function useAppointments() {
  return useQuery({
    queryKey: queryKeys.appointments,
    queryFn: async () => {
      const list = await getRepository().getAppointments();
      return sortDescBy(list, (a) => a.createdAt);
    },
  });
}

export function useSaveAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appointment: Appointment) => getRepository().saveAppointment(appointment),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.appointments }),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getRepository().deleteAppointment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.appointments }),
  });
}

// --- Rawat inap ---

export function useInpatients() {
  return useQuery({
    queryKey: queryKeys.inpatients,
    queryFn: async () => {
      const list = await getRepository().getInpatients();
      return sortDescBy(list, (item) => item.updatedAt);
    },
  });
}

export function useSaveInpatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inpatient: Inpatient) => getRepository().saveInpatient(inpatient),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.inpatients }),
  });
}

export function useDeleteInpatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getRepository().deleteInpatient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.inpatients }),
  });
}

// --- Log notifikasi ---

export function useNotificationLogs() {
  return useQuery({
    queryKey: queryKeys.logs,
    queryFn: async () => {
      const list = await getRepository().getNotificationLogs();
      return sortDescBy(list, (l) => l.timestamp);
    },
  });
}

export function useAddNotificationLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (log: NotificationLog) => getRepository().saveNotificationLog(log),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.logs }),
  });
}

export function useClearNotificationLogs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getRepository().clearNotificationLogs(),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.logs }),
  });
}

// --- Inventaris ---

export function useInventory() {
  return useQuery({ queryKey: queryKeys.inventory, queryFn: () => getRepository().getInventory() });
}

export function useSaveInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: InventoryItem) => getRepository().saveInventoryItem(item),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.inventory }),
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getRepository().deleteInventoryItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.inventory }),
  });
}

// --- Log aktivitas ---

export function useActivityLogs() {
  return useQuery({
    queryKey: queryKeys.activityLogs,
    queryFn: async () => {
      const list = await getRepository().getActivityLogs();
      return sortDescBy(list, (l) => l.timestamp);
    },
  });
}

export function useAddActivityLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (log: StaffActivityLog) => getRepository().saveActivityLog(log),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.activityLogs }),
  });
}

export function useClearActivityLogs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getRepository().clearActivityLogs(),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.activityLogs }),
  });
}

// --- POS ---

export function usePosTransactions() {
  return useQuery({
    queryKey: queryKeys.posTransactions,
    queryFn: async () => {
      const list = await getRepository().getPosTransactions();
      return sortDescBy(list, (t) => t.timestamp);
    },
  });
}

export function useSavePosTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tx: POSGroomingTransaction) => getRepository().savePosTransaction(tx),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.posTransactions }),
  });
}

export function useDeletePosTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getRepository().deletePosTransaction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.posTransactions }),
  });
}

// --- Konfigurasi / master data ---

export function useAppConfig() {
  return useQuery({ queryKey: queryKeys.config, queryFn: () => getRepository().getAppConfig() });
}

export function useSaveAppConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AppConfig>) => getRepository().saveAppConfig(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.config }),
  });
}

// --- Template WhatsApp ---

export function useWhatsAppTemplates() {
  return useQuery({ queryKey: queryKeys.waTemplates, queryFn: () => getRepository().getWhatsAppTemplates() });
}

export function useSaveWhatsAppTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templates: WhatsAppTemplate[]) => getRepository().saveWhatsAppTemplates(templates),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.waTemplates }),
  });
}

// --- Import menyeluruh ---

export function useImportSystemData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { reservations?: Reservation[]; config?: Partial<AppConfig> }) =>
      getRepository().importSystemData(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reservations });
      qc.invalidateQueries({ queryKey: queryKeys.config });
    },
  });
}

// --- util ---

function sortDescBy<T>(arr: T[], getTs: (item: T) => string): T[] {
  return [...arr].sort((a, b) => new Date(getTs(b)).getTime() - new Date(getTs(a)).getTime());
}
