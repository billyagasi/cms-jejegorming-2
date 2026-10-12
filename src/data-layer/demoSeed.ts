import {
  Reservation,
  NotificationLog,
  InventoryItem,
  StaffActivityLog,
  POSGroomingTransaction,
  GroomingStep,
  StepStatus,
  Appointment,
  Inpatient,
} from '../types';

/**
 * Generator data dummy untuk DEMO — semua tanggal RELATIF terhadap hari ini
 * agar antrean, overdue H+25, reminder, dan kalender selalu terlihat hidup.
 * Dipanggil oleh LocalRepository.ensureSeeded() saat localStorage kosong.
 */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Tanggal YYYY-MM-DD relatif terhadap hari ini */
export function daysFromNow(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO timestamp relatif terhadap hari ini */
export function isoAt(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const STEP_NAMES: [string, string][] = [
  ['cek_umum', 'Step 1: Check Up Vet Umum'],
  ['grooming_kering', 'Step 2: Treatment Kering'],
  ['grooming_basah', 'Step 3: Proses Mandi'],
  ['pengeringan', 'Step 4: Blowdry'],
  ['pemeriksaan_ulang', 'Step 5: Re-check'],
];

/** PJ default per step — konsisten dengan staffOptions / preset PJ di Database Master. */
const STEP_PICS: Record<string, string> = {
  cek_umum: 'Kak Dewi',
  grooming_kering: 'Kak Sinta',
  grooming_basah: 'Mas Rizki',
  pengeringan: 'Mas Bagas',
  pemeriksaan_ulang: 'Kak Dewi',
};

/** Bentuk pipeline 5-step sesuai progres: 0-5 langkah selesai + indikator ongoing. Semua step terisi PJ. */
function buildSteps(completedCount: number, hasOngoing: boolean): GroomingStep[] {
  return STEP_NAMES.map(([id, name], i) => {
    let status: StepStatus = 'pending';
    if (i < completedCount) status = 'completed';
    else if (i === completedCount && hasOngoing) status = 'ongoing';
    return {
      id,
      name,
      status,
      pic: STEP_PICS[id] || 'Kak Dewi',
      updatedAt: status === 'pending' ? undefined : isoAt(0, 9 + i * 0.5 > 24 ? 9 : 9 + i, 15),
    };
  });
}

export function buildDemoReservations(): Reservation[] {
  const now = new Date().toISOString();

  return [
    // === HARI INI — Kak Joni (multi-hewan → demo notifikasi kolektif) ===
    {
      id: 'demo-res-001',
      ownerName: 'Kak Joni',
      ownerPhone: '081234567890',
      ownerAddress: 'Jl. Melati No. 42, Jakarta',
      ownerEmail: 'joni.pemilik@gmail.com',
      ownerCallPreference: 'Kak',
      petName: 'Milo',
      petType: 'Kucing',
      petBreed: 'Persia Peaknose',
      petAge: '2 Tahun',
      petVaccine: 'Lengkap',
      petGender: 'Jantan',
      healthNotes: 'Kulit sensitif di pangkal paha.',
      specialPreferences: 'Potongan bulu kepala bulat boneka.',
      packageType: 'Grooming Lengkap + Haircut',
      price: 175000,
      basePrice: 150000,
      addOns: [{ name: 'Vitamin Anti Rontok Premium', price: 25000, quantity: 1 }],
      transportMode: 'Antar Sendiri',
      date: daysFromNow(0),
      timeSlot: '09:00 - 10:00',
      status: 'In_Progress',
      notes: 'Bulu bagian belakang agak gimbal. Styling model boneka/Teddy Bear.',
      steps: buildSteps(2, true),
      createdAt: isoAt(0, 8, 30),
    },
    {
      id: 'demo-res-002',
      ownerName: 'Kak Joni',
      ownerPhone: '081234567890',
      ownerAddress: 'Jl. Melati No. 42, Jakarta',
      ownerEmail: 'joni.pemilik@gmail.com',
      ownerCallPreference: 'Kak',
      petName: 'Leo',
      petType: 'Kucing',
      petBreed: 'Persia Peaknose',
      petAge: '1 Tahun',
      petVaccine: 'Lengkap',
      petGender: 'Jantan',
      healthNotes: 'Sehat prima.',
      specialPreferences: 'Shampoo aroma vanilla.',
      packageType: 'Mandi Anti Kutu & Jamur',
      price: 95000,
      basePrice: 95000,
      addOns: [],
      transportMode: 'Antar Sendiri',
      date: daysFromNow(0),
      timeSlot: '09:00 - 10:00',
      status: 'In_Progress',
      notes: 'Saudara Milo. Sifatnya lebih aktif.',
      steps: buildSteps(0, true),
      createdAt: isoAt(0, 8, 30),
    },

    // === HARI INI — Ibu Santi (Waiting) ===
    {
      id: 'demo-res-003',
      ownerName: 'Ibu Santi',
      ownerPhone: '081398765432',
      ownerAddress: 'Apartemen Greenlake Tower B, Lt. 12',
      ownerEmail: 'santi_s@hotmail.com',
      ownerCallPreference: 'Bu',
      petName: 'Bona',
      petType: 'Anjing',
      petBreed: 'Poodle Toy',
      petAge: '1 Tahun',
      petVaccine: 'Lengkap',
      petGender: 'Jantan',
      healthNotes: 'Alergi dingin berlebih, mudah bersin.',
      specialPreferences: 'Gunakan air hangat.',
      packageType: 'Mandi Bersih (Basic)',
      price: 65000,
      basePrice: 65000,
      addOns: [],
      transportMode: 'Antar Sendiri',
      date: daysFromNow(0),
      timeSlot: '12:00 - 13:00',
      status: 'Waiting',
      notes: 'Takut blower pengering, mohon perlahan.',
      steps: buildSteps(0, false),
      createdAt: isoAt(0, 8, 0),
    },

    // === KEMARIN — Mas Andi (Completed + resume) ===
    {
      id: 'demo-res-004',
      ownerName: 'Mas Andi',
      ownerPhone: '085611112222',
      ownerAddress: 'Griya Asri Gg. 5 No. 10',
      ownerEmail: 'andi.wij@yahoo.com',
      ownerCallPreference: 'Mas',
      petName: 'Kiko',
      petType: 'Kucing',
      petBreed: 'Anggora Putih',
      petAge: '3 Tahun',
      petVaccine: 'Belum',
      petGender: 'Jantan',
      healthNotes: 'Jamuran ringan di leher belakang.',
      specialPreferences: 'Shampoo sulfur obat.',
      packageType: 'Mandi Anti Kutu & Jamur',
      price: 115000,
      basePrice: 95000,
      addOns: [{ name: 'Sikat Gigi & Bersih Karang', price: 20000, quantity: 1 }],
      transportMode: 'Pet Ojek',
      date: daysFromNow(-1),
      timeSlot: '09:00 - 10:00',
      status: 'Completed',
      notes: 'Sering garuk-garuk leher belakang.',
      steps: buildSteps(5, false),
      materialsUsed: [{ itemId: 'inv-2', name: 'Sampo Medicated Sulfur (Anti-Jamur)', quantity: 1 }],
      resume: {
        weight: 3.8,
        bodyTemp: 38.5,
        skinCondition: 'Terdapat jamur ringworm kecil di leher belakang. Kutu negatif.',
        hairCondition: 'Bulu lembut tapi rontok sedang di punggung.',
        earCondition: 'Telinga kiri agak kotor kecokelatan (sudah dibersihkan).',
        nailCondition: 'Kuku dipotong pendek, tumpul dan aman.',
        groomingNotes: 'Dimandikan shampoo sulfur anti-jamur hangat. Tenang meski sedikit tegang saat blow dry.',
        recommendations: 'Oleskan salep jamur tipis, jemur pagi 10 menit, mandi anti-jamur kembali dalam 7 hari.',
        nextGroomingDateIso: daysFromNow(6),
        nextGroomingDate: daysFromNow(6).split('-').reverse().join('/'),
      },
      createdAt: isoAt(-2, 10, 0),
    },

    // === 4 HARI LALU — Kak Merry (Completed + resume) ===
    {
      id: 'demo-res-005',
      ownerName: 'Kak Merry',
      ownerPhone: '085299441122',
      ownerAddress: 'Cluster Lavender No. 12, Bekasi',
      ownerEmail: 'merry.m@yahoo.com',
      ownerCallPreference: 'Kak',
      petName: 'Chiko',
      petType: 'Kucing',
      petBreed: 'British Shorthair',
      petAge: '1.5 Tahun',
      petVaccine: 'Lengkap',
      petGender: 'Betina',
      healthNotes: 'Sehat prima, tidak ada luka.',
      specialPreferences: 'Mandi bersih wangi vanilla.',
      packageType: 'Mandi Bersih (Basic)',
      price: 65000,
      basePrice: 65000,
      addOns: [],
      transportMode: 'Antar Sendiri',
      date: daysFromNow(-4),
      timeSlot: '10:00 - 11:00',
      status: 'Completed',
      notes: 'Kucing besar, sangat kalem.',
      steps: buildSteps(5, false),
      resume: {
        weight: 5.2,
        bodyTemp: 38.2,
        skinCondition: 'Sangat bersih, bebas jamur & kutu.',
        hairCondition: 'Lebat dan kuat.',
        earCondition: 'Bersih.',
        nailCondition: 'Dipotong tumpul.',
        groomingNotes: 'Sangat kooperatif, suka dipijat.',
        recommendations: 'Ulangi grooming rutin setiap 3-4 minggu.',
        nextGroomingDateIso: daysFromNow(21),
        nextGroomingDate: daysFromNow(21).split('-').reverse().join('/'),
      },
      createdAt: isoAt(-4, 9, 0),
    },

    // === 30 HARI LALU — Bpk Budi (Completed → memicu OVERDUE H+25) ===
    {
      id: 'demo-res-006',
      ownerName: 'Bpk Budi',
      ownerPhone: '081377665544',
      ownerAddress: 'Perumahan Serpong Park Blok C No. 5',
      ownerEmail: 'budi.p@yahoo.com',
      ownerCallPreference: 'Pak',
      petName: 'Rocky',
      petType: 'Anjing',
      petBreed: 'Golden Retriever',
      petAge: '3 Tahun',
      petVaccine: 'Lengkap',
      petGender: 'Jantan',
      healthNotes: 'Bulu lebat, sedikit gatal di paha kiri.',
      specialPreferences: 'Styling bulu telapak & gunting kuku tumpul.',
      packageType: 'Grooming Lengkap + Haircut',
      price: 185000,
      basePrice: 150000,
      addOns: [{ name: 'Mandi Tambahan Degreaser Bulu', price: 35000, quantity: 1 }],
      transportMode: 'Pet Taxi',
      date: daysFromNow(-30),
      timeSlot: '11:00 - 12:00 (Istirahat)',
      status: 'Completed',
      notes: 'Anjing aktif dan senang mandi.',
      steps: buildSteps(5, false),
      resume: {
        weight: 28.5,
        bodyTemp: 38.6,
        skinCondition: 'Bersih & sehat, tidak ada jamur.',
        hairCondition: 'Lebat, halus setelah degreaser.',
        earCondition: 'Bersih.',
        nailCondition: 'Dipotong rapi.',
        groomingNotes: 'Grooming lengkap + haircut Teddy Bear untuk bulu telapak.',
        recommendations: 'Grooming rutin kembali 3-4 minggu berikutnya.',
        nextGroomingDateIso: daysFromNow(-5),
        nextGroomingDate: daysFromNow(-5).split('-').reverse().join('/'),
      },
      createdAt: isoAt(-31, 9, 15),
    },

    // === BESOK — Kak Cynthia (Waiting, muncul di kalender) ===
    {
      id: 'demo-res-007',
      ownerName: 'Kak Cynthia',
      ownerPhone: '081288776655',
      ownerAddress: 'Jl. Menteng Asri No. 12',
      ownerEmail: 'cynthia.s@gmail.com',
      ownerCallPreference: 'Kak',
      petName: 'Luna',
      petType: 'Anjing',
      petBreed: 'Poodle Toy',
      petAge: '1.5 Tahun',
      petVaccine: 'Lengkap',
      petGender: 'Betina',
      healthNotes: 'Kondisi fisik prima.',
      specialPreferences: 'Mandi spa aroma pelembut bulu.',
      packageType: 'Treatment Spa Aroma (Fluffy & Shine)',
      price: 120000,
      basePrice: 120000,
      addOns: [],
      transportMode: 'Antar Sendiri',
      date: daysFromNow(1),
      timeSlot: '10:00 - 11:00',
      status: 'Waiting',
      notes: 'Pemilik akan mengantar Luna 15 menit sebelum sesi.',
      steps: buildSteps(0, false),
      createdAt: isoAt(-1, 14, 45),
    },

    // === HARI INI — Kak Merry hewan kedua (Waiting) ===
    {
      id: 'demo-res-007',
      ownerName: 'Kak Merry',
      ownerPhone: '085299441122',
      ownerAddress: 'Cluster Lavender No. 12, Bekasi',
      ownerEmail: 'merry.m@yahoo.com',
      ownerCallPreference: 'Kak',
      petName: 'Mochi',
      petType: 'Kelinci',
      petBreed: 'Holland Lop',
      petAge: '8 Bulan',
      petVaccine: 'vaksin 1x',
      petGender: 'Jantan',
      healthNotes: 'Bulu lembut, tidak ada masalah.',
      specialPreferences: 'Sikat bulu lembut saja.',
      packageType: 'Mandi Bersih (Basic)',
      price: 65000,
      basePrice: 65000,
      addOns: [],
      transportMode: 'Antar Sendiri',
      date: daysFromNow(0),
      timeSlot: '10:00 - 11:00',
      status: 'Waiting',
      notes: 'Kelinci pemalu, hindari suara keras.',
      steps: buildSteps(0, false),
      createdAt: isoAt(-1, 16, 0),
    },
  ];
}

export function buildDemoLogs(): NotificationLog[] {
  return [
    {
      id: 'demo-notif-1',
      reservationId: 'demo-res-001',
      petName: 'Milo, Leo',
      ownerName: 'Kak Joni',
      ownerPhone: '081234567890',
      type: 'Reservation_Created',
      stepName: '',
      message:
        '[WA] NOTIFIKASI KOLEKTIF - PENERIMAAN RESERVASI 📱\n\nHalo Kak *Kak Joni*!\nKami telah menerima & mengonfirmasi pendaftaran reservasi grooming untuk seluruh hewan kesayangan Anda:\n\n   1. 🐾 *Milo* (Kucing Persia Peaknose) - Paket: Grooming Lengkap + Haircut - Sesi: 09:00 - 10:00\n   2. 🐾 *Leo* (Kucing Persia Peaknose) - Paket: Mandi Anti Kutu & Jamur - Sesi: 09:00 - 10:00\n\nTotal Estimasi Biaya Kolektif: *Rp 270.000*\n\nTerima kasih banyak telah mempercayakan perawatan hewan kesayangan Anda di Jeje Pet Care! 🐾❤️',
      timestamp: isoAt(-1, 18, 30),
      channel: 'WhatsApp',
      status: 'Delivered',
    },
    {
      id: 'demo-notif-2',
      reservationId: 'demo-res-001',
      petName: 'Milo',
      ownerName: 'Kak Joni',
      ownerPhone: '081234567890',
      type: 'Step_Update',
      stepName: 'Step 3: Proses Mandi',
      message:
        '[WA] UPDATE GROOMING MILO: Sesi Mandi selesai dikerjakan oleh Bathing Specialist. Bulunya diseka bersih dengan sampo premium, dipijat rileks, dan harum sekali! Selanjutnya masuk proses Pengeringan. 🛁',
      timestamp: isoAt(0, 9, 45),
      channel: 'WhatsApp',
      status: 'Delivered',
    },
    {
      id: 'demo-notif-3',
      reservationId: 'demo-res-004',
      petName: 'Kiko',
      ownerName: 'Mas Andi',
      ownerPhone: '085611112222',
      type: 'Grooming_Completed',
      stepName: '',
      message:
        '[WA] HORE! 🎉 Grooming Kiko telah SELESAI 100%! Kiko tampak sangat wangi, bersih, dan menawan diproses oleh tim kami. Resume catatan kesehatan & treatment bulu telah diterbitkan. Silakan jemput kesayangan Anda di Jeje Pet Care Grooming. Sampai jumpa! ❤️🐾',
      timestamp: isoAt(-1, 11, 0),
      channel: 'WhatsApp',
      status: 'Delivered',
    },
    {
      id: 'demo-notif-4',
      reservationId: 'demo-res-005',
      petName: 'Rocky',
      ownerName: 'Bpk Budi',
      ownerPhone: '081377665544',
      type: 'Grooming_Completed',
      stepName: '',
      message:
        '[WA] HORE! 🎉 Grooming Rocky telah SELESAI 100%! Rocky tampak sangat wangi, bersih, dan menawan. Silakan jemput kesayangan Anda di Jeje Pet Care Grooming. ❤️🐾',
      timestamp: isoAt(-30, 12, 30),
      channel: 'WhatsApp',
      status: 'Delivered',
    },
  ];
}

export function buildDemoInventory(): InventoryItem[] {
  return [
    { id: 'inv-1', name: 'Sampo Premium Vanilla & Fluffy', category: 'Shampoo', stock: 12, minStock: 5, unit: 'Botol', lastUpdated: daysFromNow(-1), purchaseDate: daysFromNow(-20), expiredDate: daysFromNow(180), purchasePrice: 45000, sellingPrice: 75000 },
    { id: 'inv-2', name: 'Sampo Medicated Sulfur (Anti-Jamur)', category: 'Shampoo', stock: 3, minStock: 5, unit: 'Botol', lastUpdated: daysFromNow(0), purchaseDate: daysFromNow(-35), expiredDate: daysFromNow(150), purchasePrice: 52000, sellingPrice: 85000 },
    { id: 'inv-3', name: 'Sampo Flea & Tick (Anti-Kutu)', category: 'Shampoo', stock: 2, minStock: 3, unit: 'Botol', lastUpdated: daysFromNow(-1), purchaseDate: daysFromNow(-40), expiredDate: daysFromNow(120), purchasePrice: 48000, sellingPrice: 80000 },
    { id: 'inv-4', name: 'Parfum Sweet Strawberry Mist', category: 'Parfum', stock: 8, minStock: 4, unit: 'Botol', lastUpdated: daysFromNow(-2), purchaseDate: daysFromNow(-15), expiredDate: daysFromNow(200), purchasePrice: 30000, sellingPrice: 55000 },
    { id: 'inv-5', name: 'Parfum Lavender Calming Cologne', category: 'Parfum', stock: 1, minStock: 3, unit: 'Botol', lastUpdated: daysFromNow(0), purchaseDate: daysFromNow(-50), expiredDate: daysFromNow(90), purchasePrice: 32000, sellingPrice: 58000 },
    { id: 'inv-6', name: 'Gunting Bulu Curve Premium 7-inch', category: 'Alat', stock: 5, minStock: 2, unit: 'Pcs', lastUpdated: daysFromNow(-6), purchasePrice: 250000, sellingPrice: 0 },
    { id: 'inv-7', name: 'Slicker Brush (Sisir Bulu Kusut)', category: 'Alat', stock: 1, minStock: 2, unit: 'Pcs', lastUpdated: daysFromNow(0), purchasePrice: 65000, sellingPrice: 95000 },
    { id: 'inv-8', name: 'Heavy Duty Nail Clipper (Gunting Kuku)', category: 'Alat', stock: 4, minStock: 2, unit: 'Pcs', lastUpdated: daysFromNow(-9), purchasePrice: 40000, sellingPrice: 65000 },
    { id: 'inv-9', name: 'Quiet Blower / Hair Dryer 2200W', category: 'Alat', stock: 3, minStock: 2, unit: 'Set', lastUpdated: daysFromNow(-1), purchasePrice: 450000, sellingPrice: 0 },
  ];
}

export function buildDemoPos(): POSGroomingTransaction[] {
  return [
    {
      id: 'demo-pos-001',
      ownerName: 'Kak Cynthia',
      ownerPhone: '081288776655',
      petName: 'Luna',
      petType: 'Anjing',
      items: [
        { itemName: 'Treatment Spa Aroma (Fluffy & Shine)', itemType: 'jasa', price: 120000, quantity: 1, subtotal: 120000, groomerName: 'Senior Groomer' },
        { itemName: 'Sampo Premium Vanilla & Fluffy', itemType: 'pembelian', price: 75000, quantity: 1, subtotal: 75000 },
      ],
      totalPembelian: 75000,
      totalAlat: 0,
      totalJasa: 120000,
      totalTransaction: 195000,
      paymentMethod: 'Cash',
      timestamp: isoAt(0, 10, 15),
      amountPaid: 200000,
      changeAmount: 5000,
    },
    {
      id: 'demo-pos-002',
      ownerName: 'Ibu Santi',
      ownerPhone: '081398765432',
      petName: 'Bona',
      petType: 'Anjing',
      items: [
        { itemName: 'Mandi Bersih (Basic)', itemType: 'jasa', price: 65000, quantity: 1, subtotal: 65000, groomerName: 'Bathing Specialist' },
      ],
      totalPembelian: 0,
      totalAlat: 0,
      totalJasa: 65000,
      totalTransaction: 65000,
      paymentMethod: 'QRIS',
      timestamp: isoAt(-1, 13, 30),
      amountPaid: 65000,
      changeAmount: 0,
    },
    {
      id: 'demo-pos-003',
      ownerName: 'Kak Merry',
      ownerPhone: '085299441122',
      petName: 'Chiko',
      petType: 'Kucing',
      items: [
        { itemName: 'Grooming Lengkap + Haircut', itemType: 'jasa', price: 150000, quantity: 1, subtotal: 150000, groomerName: 'Stylist' },
        { itemName: 'Heavy Duty Nail Clipper (Gunting Kuku)', itemType: 'alat', price: 65000, quantity: 1, subtotal: 65000 },
      ],
      totalPembelian: 0,
      totalAlat: 65000,
      totalJasa: 150000,
      totalTransaction: 215000,
      paymentMethod: 'Split Bill',
      timestamp: isoAt(-3, 11, 45),
      splitDetails: { cash: 100000, qris: 115000 },
    },
  ];
}

export function buildDemoActivity(): StaffActivityLog[] {
  return [
    {
      id: 'demo-act-001',
      staffName: 'admin',
      role: 'Administrator',
      action: 'Transaksi POS',
      timestamp: isoAt(0, 10, 15),
      targetId: 'demo-pos-001',
      targetName: 'Kak Cynthia',
      details: 'Invoice POS Rp 195.000 — 2 item (Cash)',
    },
    {
      id: 'demo-act-002',
      staffName: 'senior',
      role: 'Senior Groomer',
      action: 'Update Tindakan',
      timestamp: isoAt(0, 9, 45),
      targetId: 'demo-res-001',
      targetName: 'Milo',
      details: 'Step "Step 3: Proses Mandi" → completed untuk Milo',
    },
    {
      id: 'demo-act-003',
      staffName: 'admin',
      role: 'Administrator',
      action: 'Simpan Resume',
      timestamp: isoAt(-1, 11, 0),
      targetId: 'demo-res-004',
      targetName: 'Kiko',
      details: 'Resume grooming diterbitkan untuk Kiko',
    },
    {
      id: 'demo-act-004',
      staffName: 'Pelanggan / Mandiri',
      role: 'Reservasi Mandiri',
      action: 'Reservasi Portal Mandiri',
      timestamp: isoAt(-1, 16, 0),
      targetId: 'demo-res-008',
      targetName: 'Mochi',
      details: 'Registrasi mandiri oleh Kak Merry untuk Mochi (Paket: Mandi Bersih (Basic), Sesi: 10:00 - 11:00)',
    },
    {
      id: 'demo-act-005',
      staffName: 'Pelanggan / Mandiri',
      role: 'Appointment Mandiri',
      action: 'Appointment Klinik',
      timestamp: isoAt(-1, 15, 20),
      targetId: 'demo-appt-001',
      targetName: 'Bona',
      details: 'Appointment drh. Ratna Wijaya (09:00 - 10:00) — Vaksinasi & Check-up oleh Ibu Santi',
    },
  ];
}

export function buildDemoAppointments(): Appointment[] {
  return [
    {
      id: 'demo-appt-001',
      ownerName: 'Ibu Santi',
      ownerPhone: '081398765432',
      ownerAddress: 'Apartemen Greenlake Tower B, Lt. 12',
      ownerEmail: 'santi_s@hotmail.com',
      ownerCallPreference: 'Bu',
      date: daysFromNow(0),
      timeSlot: '09:00 - 10:00',
      doctorName: 'drh. Ratna Wijaya',
      accommodation: 'Diantar Sendiri',
      pets: [
        {
          petName: 'Bona',
          petType: 'Anjing',
          petBreed: 'Poodle Toy',
          petAge: '1 Tahun',
          petGender: 'Jantan',
          petVaccine: 'vaksin 1x',
          healthNotes: 'Alergi dingin berlebih.',
          reasons: ['Vaksinasi', 'Check-up'],
          conditionStory: 'Bona lesu sejak 2 hari lalu, nafsu makan menurun, tapi masih aktif saat diajak main.',
          complaints: [
            { name: 'Lemas / lesu', detail: 'Lesu 2 hari terakhir' },
            { name: 'Kurang nafsu makan', detail: 'Hanya makan 1/3 porsi biasa' },
          ],
          preVisitAnswers: [],
          treatments: [],
        },
      ],
      consentText: undefined,
      signatureData: undefined,
      status: 'Waiting',
      notes: 'Pemeriksaan rutin + lanjutan vaksin ke-2.',
      createdAt: isoAt(-1, 15, 20),
    },
    {
      id: 'demo-appt-002',
      ownerName: 'Kak Joni',
      ownerPhone: '081234567890',
      ownerAddress: 'Jl. Melati No. 42, Jakarta',
      ownerEmail: 'joni.pemilik@gmail.com',
      ownerCallPreference: 'Kak',
      date: daysFromNow(1),
      timeSlot: '10:00 - 11:00',
      doctorName: 'drh. Salsabila Putri',
      accommodation: 'Pet Taxi',
      pets: [
        {
          petName: 'Milo',
          petType: 'Kucing',
          petBreed: 'Persia Peaknose',
          petAge: '2 Tahun',
          petGender: 'Jantan',
          petVaccine: 'Lengkap',
          healthNotes: 'Kulit sensitif.',
          reasons: ['Kontrol'],
          conditionStory: 'Milo kontrol luka post-grooming di paha kiri, sudah kering namun masih sedikit merah.',
          complaints: [{ name: 'Gatal / garuk-garuk', detail: 'Sering garuk area paha kiri' }],
          preVisitAnswers: [{ question: 'Kapan keluhan pertama kali muncul?', answer: '3 hari lalu' }],
          treatments: [],
        },
        {
          petName: 'Leo',
          petType: 'Kucing',
          petBreed: 'Persia Peaknose',
          petAge: '1 Tahun',
          petGender: 'Jantan',
          petVaccine: 'vaksin 2x',
          healthNotes: 'Sehat prima.',
          reasons: ['Vaksinasi'],
          conditionStory: 'Leo sehat, datang untuk vaksinasi rabies lanjutan.',
          complaints: [],
          preVisitAnswers: [],
          treatments: [],
        },
      ],
      consentText: undefined,
      signatureData: undefined,
      status: 'Waiting',
      notes: '',
      createdAt: isoAt(-1, 18, 0),
    },
    {
      id: 'demo-appt-003',
      ownerName: 'Kak Cynthia',
      ownerPhone: '081288776655',
      ownerAddress: 'Jl. Menteng Asri No. 12',
      ownerEmail: 'cynthia.s@gmail.com',
      ownerCallPreference: 'Kak',
      date: daysFromNow(-2),
      timeSlot: '10:00 - 11:00',
      doctorName: 'drh. Bimo Prasetyo',
      accommodation: 'Diantar Sendiri',
      pets: [
        {
          petName: 'Luna',
          petType: 'Anjing',
          petBreed: 'Poodle Toy',
          petAge: '1.5 Tahun',
          petGender: 'Betina',
          petVaccine: 'Lengkap',
          healthNotes: 'Kondisi fisik prima.',
          reasons: ['Check-up'],
          conditionStory: 'Luna bersin-bersin sejak 3 hari, aktif tapi kadang bersin beruntun pagi hari.',
          complaints: [{ name: 'Bersin', detail: 'Bersin 3-4x sehari, tidak ada ingus' }],
          preVisitAnswers: [{ question: 'Kapan keluhan pertama kali muncul?', answer: '3 hari lalu' }],
          diagnosis: 'Iritasi saluran napas atas ringan (allergi debu).',
          treatments: [
            { id: 'demo-t-1', name: 'Konsultasi Dokter', type: 'tindakan', price: 100000, quantity: 1, subtotal: 100000 },
            { id: 'demo-t-2', name: 'Vitamin Booster', type: 'obat', price: 55000, quantity: 1, subtotal: 55000 },
          ],
        },
      ],
      consentText: undefined,
      signatureData: undefined,
      status: 'Completed',
      notes: '',
      billClosed: true,
      payment: { method: 'QRIS', amountPaid: 155000, changeAmount: 0, paidAt: isoAt(-2, 10, 40) },
      createdAt: isoAt(-3, 11, 0),
    },
  ];
}

export function buildDemoInpatients(): Inpatient[] {
  return [
    {
      id: 'demo-inp-001',
      appointmentId: 'demo-appt-001',
      appointmentPetIndex: 0,
      petName: 'Bona',
      petType: 'Anjing',
      petBreed: 'Poodle Toy',
      petAge: '1 Tahun',
      petGender: 'Jantan',
      ownerName: 'Ibu Santi',
      ownerPhone: '081398765432',
      cageNumber: 'Kandang Rawat Inap 01',
      admissionDate: daysFromNow(-1),
      status: 'Observasi',
      diagnosis: 'Gastroenteritis ringan dengan dehidrasi; observasi respons terapi cairan.',
      doctorName: 'drh. Ratna Wijaya',
      emergencyContact: '081398765432',
      dailyNotes: [
        {
          id: 'demo-inp-note-001',
          date: daysFromNow(-1),
          time: '16:20',
          temperature: 39.1,
          condition: 'Pasien sadar dan responsif, masih lemas. Belum muntah kembali sejak masuk kandang.',
          treatment: 'Terapi cairan dan diet gastrointestinal dalam porsi kecil.',
          checkedBy: 'drh. Ratna Wijaya',
          medicalTreatment: 'Monitoring suhu, hidrasi, frekuensi muntah, dan intake makanan.',
          inventoryItems: [],
          createdAt: isoAt(-1, 16, 20),
        },
        {
          id: 'demo-inp-note-002',
          date: daysFromNow(0),
          time: '08:15',
          temperature: 38.6,
          condition: 'Lebih aktif, mau makan sekitar setengah porsi, tidak ada muntah semalam.',
          treatment: 'Terapi cairan dilanjutkan dan evaluasi pulang sore hari bila kondisi stabil.',
          checkedBy: 'drh. Ratna Wijaya',
          inventoryItems: [],
          createdAt: isoAt(0, 8, 15),
        },
      ],
      createdAt: isoAt(-1, 14, 0),
      updatedAt: isoAt(0, 8, 15),
    },
  ];
}

/** Jalankan seluruh seeding demo ke localStorage. */
export function seedDemoDataToStorage(write: (key: string, value: unknown) => void): void {
  write('jeje_cached_reservations', buildDemoReservations());
  write('jeje_cached_logs', buildDemoLogs());
  write('jeje_cached_inventory', buildDemoInventory());
  write('jeje_cached_pos_transactions', buildDemoPos());
  write('jeje_cached_activityLogs', buildDemoActivity());
  write('jpc_appointments', buildDemoAppointments());
  write('jpc_inpatients', buildDemoInpatients());
}
