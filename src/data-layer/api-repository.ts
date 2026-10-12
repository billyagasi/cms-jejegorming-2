import { AppRepository } from './repository';
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
 * Stub implementasi API untuk Phase 2 (Golang Gin + PostgreSQL).
 * Diisi penuh saat backend Go tersedia; UI tidak perlu diubah karena
 * seluruh akses data sudah melewati interface AppRepository.
 */

export class ApiRepository implements AppRepository {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private request<T>(path: string, init?: RequestInit): Promise<T> {
    return fetch(`${this.baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      ...init,
    }).then(async (res) => {
      if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
      return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
    });
  }

  // Placeholder — akan diimplementasikan pada Phase 2 bersama backend Gin.
  getReservations() {
    return this.request<Reservation[]>('/api/reservations');
  }
  saveReservation(): Promise<void> {
    return Promise.reject(new Error('ApiRepository belum diimplementasikan (Phase 2).'));
  }
  saveReservations(): Promise<void> {
    return Promise.reject(new Error('ApiRepository belum diimplementasikan (Phase 2).'));
  }
  deleteReservation(): Promise<void> {
    return Promise.reject(new Error('ApiRepository belum diimplementasikan (Phase 2).'));
  }
  getAppointments() {
    return this.request<Appointment[]>('/api/appointments');
  }
  saveAppointment(): Promise<void> {
    return Promise.reject(new Error('ApiRepository belum diimplementasikan (Phase 2).'));
  }
  deleteAppointment(): Promise<void> {
    return Promise.reject(new Error('ApiRepository belum diimplementasikan (Phase 2).'));
  }
  getInpatients() {
    return this.request<Inpatient[]>('/api/inpatients');
  }
  saveInpatient(): Promise<void> {
    return Promise.reject(new Error('ApiRepository belum diimplementasikan (Phase 2).'));
  }
  deleteInpatient(): Promise<void> {
    return Promise.reject(new Error('ApiRepository belum diimplementasikan (Phase 2).'));
  }
  getNotificationLogs() {
    return this.request<NotificationLog[]>('/api/logs');
  }
  saveNotificationLog(): Promise<void> {
    return Promise.reject(new Error('ApiRepository belum diimplementasikan (Phase 2).'));
  }
  clearNotificationLogs(): Promise<void> {
    return Promise.reject(new Error('ApiRepository belum diimplementasikan (Phase 2).'));
  }
  getInventory() {
    return this.request<InventoryItem[]>('/api/inventory');
  }
  saveInventoryItem(): Promise<void> {
    return Promise.reject(new Error('ApiRepository belum diimplementasikan (Phase 2).'));
  }
  deleteInventoryItem(): Promise<void> {
    return Promise.reject(new Error('ApiRepository belum diimplementasikan (Phase 2).'));
  }
  getActivityLogs() {
    return this.request<StaffActivityLog[]>('/api/activity-logs');
  }
  saveActivityLog(): Promise<void> {
    return Promise.reject(new Error('ApiRepository belum diimplementasikan (Phase 2).'));
  }
  clearActivityLogs(): Promise<void> {
    return Promise.reject(new Error('ApiRepository belum diimplementasikan (Phase 2).'));
  }
  getPosTransactions() {
    return this.request<POSGroomingTransaction[]>('/api/pos-transactions');
  }
  savePosTransaction(): Promise<void> {
    return Promise.reject(new Error('ApiRepository belum diimplementasikan (Phase 2).'));
  }
  deletePosTransaction(): Promise<void> {
    return Promise.reject(new Error('ApiRepository belum diimplementasikan (Phase 2).'));
  }
  getAppConfig() {
    return this.request<AppConfig>('/api/settings');
  }
  saveAppConfig(): Promise<void> {
    return Promise.reject(new Error('ApiRepository belum diimplementasikan (Phase 2).'));
  }
  getWhatsAppTemplates() {
    return this.request<WhatsAppTemplate[]>('/api/whatsapp-templates');
  }
  saveWhatsAppTemplates(): Promise<void> {
    return Promise.reject(new Error('ApiRepository belum diimplementasikan (Phase 2).'));
  }
  importSystemData(): Promise<void> {
    return Promise.reject(new Error('ApiRepository belum diimplementasikan (Phase 2).'));
  }
}
