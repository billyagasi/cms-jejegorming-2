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
  Surgery,
  VaccinationRecord,
  ClinicalFollowUp,
} from '../types';
import { AppRepository } from './repository';
import { loadFromStorage, saveToStorage } from './storage';
import { DEFAULT_APP_CONFIG, DEFAULT_WA_TEMPLATES } from './seeds';
import { seedDemoDataToStorage } from './demoSeed';

/**
 * Implementasi repository berbasis localStorage.
 * Menggunakan key yang sama dengan aplikasi lama (jeje_cached_*) agar data
 * existing di browser pelanggan tetap terbaca.
 *
 * Mode demo: jika localStorage kosong, otomatis diisi data dummy dengan
 * tanggal relatif terhadap hari ini (lihat demoSeed.ts). Nonaktifkan via
 * VITE_DEMO_SEED=false.
 */

const KEYS = {
  reservations: 'jeje_cached_reservations',
  appointments: 'jpc_appointments',
  inpatients: 'jpc_inpatients',
  surgeries: 'jpc_surgeries',
  vaccinations: 'jpc_vaccinations',
  clinicalFollowUps: 'jpc_clinical_follow_ups',
  logs: 'jeje_cached_logs',
  inventory: 'jeje_cached_inventory',
  activityLogs: 'jeje_cached_activityLogs',
  posTransactions: 'jeje_cached_pos_transactions',
  config: 'jpc_config',
  waTemplates: 'jeje_whatsapp_templates',
};

const DEMO_FLAG = 'jpc_demo_seeded';

function isDemoSeedEnabled(): boolean {
  return (import.meta.env.VITE_DEMO_SEED as string | undefined) !== 'false';
}

function isKeyEmpty(key: string): boolean {
  try {
    const raw = localStorage.getItem(key);
    return !raw || raw === '[]' || raw === 'null';
  } catch {
    return true;
  }
}

function sortDesc<T>(arr: T[], getTs: (item: T) => string): T[] {
  return [...arr].sort((a, b) => new Date(getTs(b)).getTime() - new Date(getTs(a)).getTime());
}

export class LocalRepository implements AppRepository {
  /**
   * Seed data demo saat pertama kali dijalankan (localStorage kosong).
   * Aman dipanggil di awal setiap get* — hanya melakukan cek flag murah.
   */
  private ensureSeeded(): void {
    if (!isDemoSeedEnabled()) return;
    try {
      if (localStorage.getItem(DEMO_FLAG) === 'true') return;
      // Hanya seed bila data utama benar-benar kosong (jangan menimpa data nyata)
      if (!isKeyEmpty(KEYS.reservations)) {
        localStorage.setItem(DEMO_FLAG, 'true');
        return;
      }
      seedDemoDataToStorage((key, value) => saveToStorage(key, value as never));
      localStorage.setItem(DEMO_FLAG, 'true');
    } catch {
      // localStorage diblokir — abaikan
    }
  }

  /** Hapus seluruh data & regenerasi data dummy demo. */
  resetDemoData(): void {
    if (!isDemoSeedEnabled()) return;
    try {
      Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
      seedDemoDataToStorage((key, value) => saveToStorage(key, value));
      localStorage.setItem(DEMO_FLAG, 'true');
    } catch {
      /* diabaikan */
    }
  }

  // --- Reservasi ---
  async getReservations(): Promise<Reservation[]> {
    this.ensureSeeded();
    return loadFromStorage<Reservation[]>(KEYS.reservations, []);
  }

  async saveReservation(res: Reservation): Promise<void> {
    const list = loadFromStorage<Reservation[]>(KEYS.reservations, []);
    const idx = list.findIndex((r) => r.id === res.id);
    if (idx >= 0) list[idx] = res;
    else list.unshift(res);
    saveToStorage(KEYS.reservations, list);
  }

  async saveReservations(list: Reservation[]): Promise<void> {
    const existing = loadFromStorage<Reservation[]>(KEYS.reservations, []);
    list.forEach((res) => {
      const idx = existing.findIndex((r) => r.id === res.id);
      if (idx >= 0) existing[idx] = res;
      else existing.unshift(res);
    });
    saveToStorage(KEYS.reservations, existing);
  }

  async deleteReservation(id: string): Promise<void> {
    const list = loadFromStorage<Reservation[]>(KEYS.reservations, []);
    saveToStorage(
      KEYS.reservations,
      list.filter((r) => r.id !== id)
    );
  }

  // --- Appointment klinik ---
  async getAppointments(): Promise<Appointment[]> {
    this.ensureSeeded();
    return loadFromStorage<Appointment[]>(KEYS.appointments, []);
  }

  async saveAppointment(appointment: Appointment): Promise<void> {
    const list = loadFromStorage<Appointment[]>(KEYS.appointments, []);
    const idx = list.findIndex((a) => a.id === appointment.id);
    if (idx >= 0) list[idx] = appointment;
    else list.unshift(appointment);
    saveToStorage(KEYS.appointments, list);
  }

  async deleteAppointment(id: string): Promise<void> {
    const list = loadFromStorage<Appointment[]>(KEYS.appointments, []);
    saveToStorage(
      KEYS.appointments,
      list.filter((a) => a.id !== id)
    );
  }

  // --- Rawat inap ---
  async getInpatients(): Promise<Inpatient[]> {
    this.ensureSeeded();
    return loadFromStorage<Inpatient[]>(KEYS.inpatients, []);
  }

  async saveInpatient(inpatient: Inpatient): Promise<void> {
    const list = loadFromStorage<Inpatient[]>(KEYS.inpatients, []);
    const idx = list.findIndex((item) => item.id === inpatient.id);
    if (idx >= 0) list[idx] = inpatient;
    else list.unshift(inpatient);
    saveToStorage(KEYS.inpatients, list);
  }

  async deleteInpatient(id: string): Promise<void> {
    const list = loadFromStorage<Inpatient[]>(KEYS.inpatients, []);
    saveToStorage(KEYS.inpatients, list.filter((item) => item.id !== id));
  }

  // --- Operasi / bedah ---
  async getSurgeries(): Promise<Surgery[]> {
    this.ensureSeeded();
    return loadFromStorage<Surgery[]>(KEYS.surgeries, []);
  }

  async saveSurgery(surgery: Surgery): Promise<void> {
    const list = loadFromStorage<Surgery[]>(KEYS.surgeries, []);
    const idx = list.findIndex((item) => item.id === surgery.id);
    if (idx >= 0) list[idx] = surgery;
    else list.unshift(surgery);
    saveToStorage(KEYS.surgeries, list);
  }

  async deleteSurgery(id: string): Promise<void> {
    const list = loadFromStorage<Surgery[]>(KEYS.surgeries, []);
    saveToStorage(KEYS.surgeries, list.filter((item) => item.id !== id));
  }

  // --- Vaksinasi ---
  async getVaccinations(): Promise<VaccinationRecord[]> {
    this.ensureSeeded();
    return loadFromStorage<VaccinationRecord[]>(KEYS.vaccinations, []);
  }

  async saveVaccination(record: VaccinationRecord): Promise<void> {
    const list = loadFromStorage<VaccinationRecord[]>(KEYS.vaccinations, []);
    const idx = list.findIndex((item) => item.id === record.id);
    if (idx >= 0) list[idx] = record;
    else list.unshift(record);
    saveToStorage(KEYS.vaccinations, list);
  }

  async deleteVaccination(id: string): Promise<void> {
    const list = loadFromStorage<VaccinationRecord[]>(KEYS.vaccinations, []);
    saveToStorage(KEYS.vaccinations, list.filter((item) => item.id !== id));
  }

  // --- Follow-up klinis ---
  async getClinicalFollowUps(): Promise<ClinicalFollowUp[]> {
    this.ensureSeeded();
    return loadFromStorage<ClinicalFollowUp[]>(KEYS.clinicalFollowUps, []);
  }

  async saveClinicalFollowUp(followUp: ClinicalFollowUp): Promise<void> {
    const list = loadFromStorage<ClinicalFollowUp[]>(KEYS.clinicalFollowUps, []);
    const idx = list.findIndex((item) => item.id === followUp.id);
    if (idx >= 0) list[idx] = followUp;
    else list.unshift(followUp);
    saveToStorage(KEYS.clinicalFollowUps, list);
  }

  async deleteClinicalFollowUp(id: string): Promise<void> {
    const list = loadFromStorage<ClinicalFollowUp[]>(KEYS.clinicalFollowUps, []);
    saveToStorage(KEYS.clinicalFollowUps, list.filter((item) => item.id !== id));
  }

  // --- Log notifikasi ---
  async getNotificationLogs(): Promise<NotificationLog[]> {
    this.ensureSeeded();
    return loadFromStorage<NotificationLog[]>(KEYS.logs, []);
  }

  async saveNotificationLog(log: NotificationLog): Promise<void> {
    const list = loadFromStorage<NotificationLog[]>(KEYS.logs, []);
    const idx = list.findIndex((l) => l.id === log.id);
    if (idx >= 0) list[idx] = log;
    else list.unshift(log);
    saveToStorage(KEYS.logs, list.slice(0, 200));
  }

  async clearNotificationLogs(): Promise<void> {
    saveToStorage(KEYS.logs, []);
  }

  // --- Inventaris ---
  async getInventory(): Promise<InventoryItem[]> {
    this.ensureSeeded();
    return loadFromStorage<InventoryItem[]>(KEYS.inventory, []);
  }

  async saveInventoryItem(item: InventoryItem): Promise<void> {
    const list = loadFromStorage<InventoryItem[]>(KEYS.inventory, []);
    const idx = list.findIndex((i) => i.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.unshift(item);
    saveToStorage(KEYS.inventory, list);
  }

  async deleteInventoryItem(id: string): Promise<void> {
    const list = loadFromStorage<InventoryItem[]>(KEYS.inventory, []);
    saveToStorage(
      KEYS.inventory,
      list.filter((i) => i.id !== id)
    );
  }

  // --- Log aktivitas ---
  async getActivityLogs(): Promise<StaffActivityLog[]> {
    this.ensureSeeded();
    return loadFromStorage<StaffActivityLog[]>(KEYS.activityLogs, []);
  }

  async saveActivityLog(log: StaffActivityLog): Promise<void> {
    const list = loadFromStorage<StaffActivityLog[]>(KEYS.activityLogs, []);
    list.unshift(log);
    saveToStorage(KEYS.activityLogs, list.slice(0, 200));
  }

  async clearActivityLogs(): Promise<void> {
    saveToStorage(KEYS.activityLogs, []);
  }

  // --- POS ---
  async getPosTransactions(): Promise<POSGroomingTransaction[]> {
    this.ensureSeeded();
    return loadFromStorage<POSGroomingTransaction[]>(KEYS.posTransactions, []);
  }

  async savePosTransaction(tx: POSGroomingTransaction): Promise<void> {
    const list = loadFromStorage<POSGroomingTransaction[]>(KEYS.posTransactions, []);
    const idx = list.findIndex((t) => t.id === tx.id);
    if (idx >= 0) list[idx] = tx;
    else list.unshift(tx);
    saveToStorage(KEYS.posTransactions, list);
  }

  async deletePosTransaction(id: string): Promise<void> {
    const list = loadFromStorage<POSGroomingTransaction[]>(KEYS.posTransactions, []);
    saveToStorage(
      KEYS.posTransactions,
      list.filter((t) => t.id !== id)
    );
  }

  // --- Konfigurasi ---
  async getAppConfig(): Promise<AppConfig> {
    this.ensureSeeded();
    const saved = loadFromStorage<Partial<AppConfig> | null>(KEYS.config, null);
    if (saved) {
      const merged: AppConfig = { ...DEFAULT_APP_CONFIG, ...saved };
      // Migrasi: backfill field yang kosong dengan nilai default (cth. config lama
      // sebelum PJ/staf diisi di demo seed)
      if (!merged.staffOptions || merged.staffOptions.length === 0) {
        merged.staffOptions = DEFAULT_APP_CONFIG.staffOptions;
      }
      const pjEmpty = !merged.stepPJPresets?.length || merged.stepPJPresets.every((p) => !p.defaultPic);
      if (pjEmpty) {
        merged.stepPJPresets = DEFAULT_APP_CONFIG.stepPJPresets;
      }
      return merged;
    }
    // Migrasi dari key lama aplikasi sebelumnya (jika ada)
    const legacy = {
      packages: loadFromStorage('jeje_cached_packages', DEFAULT_APP_CONFIG.packages),
      addons: loadFromStorage('jeje_cached_addons', DEFAULT_APP_CONFIG.addons),
      transportPresets: loadFromStorage('jeje_cached_transportPresets', DEFAULT_APP_CONFIG.transportPresets),
      stepPJPresets: loadFromStorage('jeje_cached_stepPJPresets', DEFAULT_APP_CONFIG.stepPJPresets),
      vaccinePresets: loadFromStorage('jeje_cached_vaccinePresets', DEFAULT_APP_CONFIG.vaccinePresets),
      staffOptions: loadFromStorage('jeje_cached_staffOptions', DEFAULT_APP_CONFIG.staffOptions),
      sessionQuotas: loadFromStorage('jeje_cached_sessionQuotas', DEFAULT_APP_CONFIG.sessionQuotas),
      weeklyHolidays: loadFromStorage('jeje_cached_weeklyHolidays', DEFAULT_APP_CONFIG.weeklyHolidays),
      specialHolidays: loadFromStorage('jeje_cached_specialHolidays', DEFAULT_APP_CONFIG.specialHolidays),
      inventoryCategories: loadFromStorage('jeje_cached_inventoryCategories', DEFAULT_APP_CONFIG.inventoryCategories),
      loyalty: {
        minSpend: loadFromStorage('jeje_cached_loyaltyMinSpend', DEFAULT_APP_CONFIG.loyalty.minSpend),
        pointValue: loadFromStorage('jeje_cached_loyaltyPointValue', DEFAULT_APP_CONFIG.loyalty.pointValue),
        minRedeem: loadFromStorage('jeje_cached_loyaltyMinRedeem', DEFAULT_APP_CONFIG.loyalty.minRedeem),
      },
      activeTheme: localStorage.getItem('pet_grooming_branding_theme') || DEFAULT_APP_CONFIG.activeTheme,
      roleAccounts: loadFromStorage('jeje_cached_roleAccounts', DEFAULT_APP_CONFIG.roleAccounts),
    };
    return { ...DEFAULT_APP_CONFIG, ...legacy };
  }

  async saveAppConfig(patch: Partial<AppConfig>): Promise<void> {
    const current = await this.getAppConfig();
    saveToStorage(KEYS.config, { ...current, ...patch });
  }

  // --- Template WhatsApp ---
  async getWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
    this.ensureSeeded();
    const saved = loadFromStorage<WhatsAppTemplate[] | null>(KEYS.waTemplates, null);
    return saved && saved.length > 0 ? saved : DEFAULT_WA_TEMPLATES;
  }

  async saveWhatsAppTemplates(templates: WhatsAppTemplate[]): Promise<void> {
    saveToStorage(KEYS.waTemplates, templates);
  }

  // --- Import menyeluruh ---
  async importSystemData(data: { reservations?: Reservation[]; config?: Partial<AppConfig> }): Promise<void> {
    if (data.reservations) {
      const existing = loadFromStorage<Reservation[]>(KEYS.reservations, []);
      const merged = [...data.reservations];
      existing.forEach((r) => {
        if (!merged.some((m) => m.id === r.id)) merged.push(r);
      });
      saveToStorage(KEYS.reservations, merged);
    }
    if (data.config) {
      const current = await this.getAppConfig();
      saveToStorage(KEYS.config, { ...current, ...data.config });
    }
  }
}
