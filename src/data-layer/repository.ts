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
 * Kontrak data aplikasi.
 * - Phase 1: LocalRepository (localStorage)
 * - Phase 2: ApiRepository (Golang Gin REST + SSE)
 */
export interface AppRepository {
  // Reservasi
  getReservations(): Promise<Reservation[]>;
  saveReservation(res: Reservation): Promise<void>;
  saveReservations(list: Reservation[]): Promise<void>;
  deleteReservation(id: string): Promise<void>;

  // Appointment klinik
  getAppointments(): Promise<Appointment[]>;
  saveAppointment(appointment: Appointment): Promise<void>;
  deleteAppointment(id: string): Promise<void>;

  // Rawat inap
  getInpatients(): Promise<Inpatient[]>;
  saveInpatient(inpatient: Inpatient): Promise<void>;
  deleteInpatient(id: string): Promise<void>;

  // Log notifikasi WhatsApp
  getNotificationLogs(): Promise<NotificationLog[]>;
  saveNotificationLog(log: NotificationLog): Promise<void>;
  clearNotificationLogs(): Promise<void>;

  // Inventaris
  getInventory(): Promise<InventoryItem[]>;
  saveInventoryItem(item: InventoryItem): Promise<void>;
  deleteInventoryItem(id: string): Promise<void>;

  // Log aktivitas staf
  getActivityLogs(): Promise<StaffActivityLog[]>;
  saveActivityLog(log: StaffActivityLog): Promise<void>;
  clearActivityLogs(): Promise<void>;

  // Transaksi POS
  getPosTransactions(): Promise<POSGroomingTransaction[]>;
  savePosTransaction(tx: POSGroomingTransaction): Promise<void>;
  deletePosTransaction(id: string): Promise<void>;

  // Master data / konfigurasi aplikasi
  getAppConfig(): Promise<AppConfig>;
  saveAppConfig(patch: Partial<AppConfig>): Promise<void>;

  // Template WhatsApp
  getWhatsAppTemplates(): Promise<WhatsAppTemplate[]>;
  saveWhatsAppTemplates(templates: WhatsAppTemplate[]): Promise<void>;

  // Import menyeluruh (restore JSON)
  importSystemData(data: { reservations?: Reservation[]; config?: Partial<AppConfig> }): Promise<void>;
}
