export type PetType = 'Kucing' | 'Anjing' | 'Kelinci' | 'Lainnya';

export type ReservationStatus = 'Waiting' | 'In_Progress' | 'Completed' | 'Cancelled';

export type StepStatus = 'pending' | 'ongoing' | 'completed';

export interface GroomingStep {
  id: string;
  name: string;
  status: StepStatus;
  pic: string;
  updatedAt?: string;
}

export interface SelectedAddOn {
  name: string;
  price: number;
  quantity: number;
}

export interface ResumeGrooming {
  weight?: number;
  bodyTemp?: number;
  skinCondition: string;
  hairCondition: string;
  earCondition: string;
  nailCondition: string;
  mouthCondition?: string;
  noseCondition?: string;
  groomingNotes: string;
  recommendations: string;
  driverName?: string;
  assistantName?: string;
  vehiclePlate?: string;
  nextGroomingDate?: string;
  nextGroomingDateIso?: string;
  nextGroomingType?: string;
}

export interface Reservation {
  id: string;
  ownerName: string;
  ownerPhone: string;
  ownerAddress?: string;
  ownerEmail?: string;
  ownerCallPreference?: string;
  ownerProfession?: string;
  petName: string;
  petType: PetType;
  petBreed: string;
  petAge?: string;
  petGender?: string;
  petVaccine?: string;
  healthNotes?: string;
  specialPreferences?: string;
  packageType: string;
  price: number;
  basePrice?: number;
  addOns?: SelectedAddOn[];
  transportMode?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  discountApplied?: number;
  date: string; // YYYY-MM-DD
  timeSlot: string;
  status: ReservationStatus;
  steps: GroomingStep[];
  notes?: string;
  resume?: ResumeGrooming;
  photoUrl?: string;
  photos?: string[];
  signatureData?: string;
  /** Material/barang grooming yang terpakai — stok Inventaris dikurangi via delta */
  materialsUsed?: ReservationMaterial[];
  createdAt: string;
}

export type NotificationLogType =
  | 'Reservation_Created'
  | 'Appointment_Created'
  | 'Appointment_Confirmed'
  | 'Appointment_Checked_In'
  | 'Step_Update'
  | 'Grooming_Completed'
  | 'Rescheduled';

export interface NotificationLog {
  id: string;
  reservationId: string;
  petName: string;
  ownerName: string;
  ownerPhone: string;
  type: NotificationLogType;
  stepName?: string;
  message: string;
  timestamp: string;
  channel: 'WhatsApp' | 'SMS';
  status: 'Sent' | 'Delivered';
}

export interface RoleAccount {
  role: string;
  username: string;
  password: string;
  allowedTabs?: string[];
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  lastUpdated: string;
  expiredDate?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  sellingPrice?: number;
}

export interface StaffActivityLog {
  id: string;
  staffName: string;
  role: string;
  action: string;
  timestamp: string;
  targetId: string;
  targetName: string;
  details: string;
}

export interface SpecialHoliday {
  date: string;
  name: string;
}

export interface POSItem {
  itemId?: string;
  itemName: string;
  itemType: 'pembelian' | 'alat' | 'jasa' | string;
  price: number;
  quantity: number;
  subtotal: number;
  groomerName?: string;
  notes?: string;
}

export interface POSGroomingTransaction {
  id: string;
  ownerName: string;
  ownerPhone: string;
  petName: string;
  petType?: string;
  items: POSItem[];
  totalPembelian: number;
  totalAlat: number;
  totalJasa: number;
  totalTransaction: number;
  paymentMethod: 'Cash' | 'Transfer' | 'QRIS' | 'Debit' | 'Split Bill' | string;
  timestamp: string;
  notes?: string;
  amountPaid?: number;
  changeAmount?: number;
  splitDetails?: {
    cash?: number;
    transfer?: number;
    qris?: number;
    debit?: number;
  };
}

// --- Master data ---

export interface PackageItem {
  name: string;
  price: number;
  desc: string;
}

export interface AddOnItem {
  name: string;
  price: number;
  desc: string;
}

export interface TransportPreset {
  id: string;
  driverName: string;
  assistantName: string;
  vehiclePlate: string;
}

export interface StepPJPreset {
  id: string;
  name: string;
  defaultPic: string;
}

export interface LoyaltySettings {
  minSpend: number;
  pointValue: number;
  minRedeem: number;
}

// --- Appointment (Klinik) ---

export interface AppointmentComplaint {
  /** Nama keluhan dari master, cth. 'Muntah' */
  name: string;
  /** Kolom isian detail, cth. '1x muntah (makanan)' */
  detail: string;
}

export interface AppointmentTreatmentItem {
  id: string;
  /** Nama item, cth. 'Konsultasi Dokter', 'Amoxicillin 500mg' */
  name: string;
  type: 'obat' | 'tindakan' | 'produk' | 'lainnya';
  price: number;
  quantity: number;
  subtotal: number;
  /** Link ke Inventaris — stok berkurang saat Tutup Bill */
  itemId?: string;
}

/** Material grooming yang terpakai — stok Inventaris berkurang via delta */
export interface ReservationMaterial {
  itemId?: string;
  name: string;
  quantity: number;
}

export interface AppointmentPet {
  petName: string;
  petType: PetType;
  petBreed: string;
  petAge?: string;
  petGender?: string;
  petVaccine?: string;
  healthNotes?: string;
  /** Alasan kunjungan — maks 2, dari master appointmentReasons */
  reasons: string[];
  /** Cerita kondisi (anamnesa) */
  conditionStory: string;
  /** Keluhan multiple dengan kolom isian */
  complaints: AppointmentComplaint[];
  /** Jawaban pertanyaan sebelum datang — bisa dikosongkan, diisi admin saat datang */
  preVisitAnswers: { question: string; answer: string }[];
  /** Diagnosis dokter (diisi staf saat penanganan) */
  diagnosis?: string;
  /** Tindakan & obat yang diberikan (membentuk bill) */
  treatments: AppointmentTreatmentItem[];
}

export interface Appointment {
  id: string;
  ownerName: string;
  ownerPhone: string;
  ownerAddress?: string;
  ownerEmail?: string;
  ownerCallPreference?: string;
  ownerProfession?: string;
  /** YYYY-MM-DD */
  date: string;
  /** Slot praktik 1 jam, cth. '09:00 - 10:00' */
  timeSlot: string;
  /** 1 dokter per booking (dipilih pelanggan atau auto-assign) */
  doctorName?: string;
  /** Snapshot layanan khusus yang dipilih saat registrasi publik. */
  service?: ClinicalService;
  /** Pet Taxi | Pet Ojek | Diantar Sendiri | Diantar Kerabat/Keluarga */
  accommodation: string;
  /** Maks 2 hewan per booking */
  pets: AppointmentPet[];
  /** Snapshot teks informed consent saat booking */
  consentText?: string;
  signatureData?: string;
  status: ReservationStatus;
  /** Tahap operasional appointment tanpa mengubah status bersama milik grooming. */
  confirmedAt?: string;
  checkedInAt?: string;
  completedAt?: string;
  /** Nomor antrean klinik yang diberikan saat check-in. */
  queueNumber?: string;
  cancelReason?: string;
  notes?: string;
  createdAt: string;
  /** Bill ditutup (sudah dibayar & stok obat dipotong) */
  billClosed?: boolean;
  payment?: {
    method: 'Cash' | 'Transfer' | 'QRIS' | 'Debit' | string;
    amountPaid?: number;
    changeAmount?: number;
    paidAt?: string;
  };
}

// --- Rawat Inap (Klinik) ---

export type InpatientStatus = 'Perawatan Aktif' | 'Observasi' | 'Kritis' | 'Sudah Pulang';

export interface InpatientInventoryUsage {
  itemId: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  price: number;
}

export interface InpatientNote {
  id: string;
  date: string;
  time: string;
  temperature: number;
  condition: string;
  treatment: string;
  checkedBy: string;
  medicalTreatment?: string;
  notes?: string;
  inventoryItems: InpatientInventoryUsage[];
  createdAt: string;
}

/** Snapshot pasien disimpan agar riwayat rawat inap tidak berubah saat data sumber berubah. */
export interface Inpatient {
  id: string;
  appointmentId?: string;
  appointmentPetIndex?: number;
  petName: string;
  petType: PetType;
  petBreed: string;
  petAge?: string;
  petGender?: string;
  ownerName: string;
  ownerPhone: string;
  cageNumber: string;
  admissionDate: string;
  dischargeDate?: string;
  status: InpatientStatus;
  diagnosis: string;
  doctorName: string;
  emergencyContact: string;
  dailyNotes: InpatientNote[];
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentSettings {
  /** Jam praktik, cth. '09:00 - 10:00' */
  sessionHours: string[];
  /** Kuota hewan per slot jam (default 2) */
  maxPetsPerHour: number;
  /** Toggle back office: pelanggan boleh memilih dokter */
  allowDoctorSelection: boolean;
  /** Teks informed consent yang bisa di-setup */
  consentText: string;
}

export interface ClinicalService {
  name: string;
  price: number;
  category: string;
  description: string;
}

export interface AppConfig {
  packages: PackageItem[];
  addons: AddOnItem[];
  transportPresets: TransportPreset[];
  stepPJPresets: StepPJPreset[];
  vaccinePresets: string[];
  staffOptions: string[];
  sessionQuotas: Record<string, number>;
  weeklyHolidays: number[];
  specialHolidays: SpecialHoliday[];
  inventoryCategories: string[];
  loyalty: LoyaltySettings;
  activeTheme: string;
  adminPassword: string;
  ownerUsername: string;
  ownerAccessCode: string;
  roleAccounts: RoleAccount[];
  /** Appointment klinik — master data */
  doctors: string[];
  appointmentReasons: string[];
  appointmentComplaints: string[];
  appointmentPreVisitQuestions: string[];
  /** Katalog layanan yang dipilih sebelum dokter dan jadwal. */
  clinicalServices: ClinicalService[];
  appointmentSettings: AppointmentSettings;
  /** Master tindakan & obat klinik (untuk bill appointment) */
  clinicItems: ClinicItem[];
}

export interface ClinicItem {
  id: string;
  name: string;
  price: number;
  type: 'obat' | 'tindakan' | 'produk' | 'lainnya';
}

export type WhatsAppTemplateCategory =
  | 'Ucapan Terima Kasih'
  | 'Konfirmasi'
  | 'Pengingat'
  | 'Lainnya';

export interface WhatsAppTemplate {
  id: string;
  title: string;
  content: string;
  category: WhatsAppTemplateCategory;
}
