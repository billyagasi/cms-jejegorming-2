export interface DraftPet {
  id: string;
  petName: string;
  petType: 'Kucing' | 'Anjing' | 'Kelinci' | 'Lainnya';
  petBreed: string;
  petAge: string;
  petGender: string;
  petVaccine: string;
  healthNotes: string;
  specialPreferences: string;
  packageType: string;
  selectedAddOns: { name: string; price: number; quantity: number }[];
}

export const CONSENT_CLAUSES: { title: string; body: string }[] = [
  {
    title: '1. Kondisi Kesehatan',
    body: 'Grooming merupakan kegiatan yang dapat menimbulkan stress. Dengan mengisi form ini, pemilik menyatakan bahwa hewan peliharaan dalam kondisi prima, sehat dan layak menjalani sesi grooming, sudah divaksin secara berkala, dan tidak memiliki penyakit menular yang membahayakan hewan lain. Pemilik wajib memberi tahu staff yang bertugas jika hewan memiliki riwayat penyakit (seperti penyakit jantung, epilepsi, history pengobatan sebelumnya atau asma). Segala komplikasi, serangan jantung, syok, sesak nafas atau kejang akibat riwayat penyakit bawaan tersembunyi bukan tanggung jawab Jeje Pet Care.',
  },
  {
    title: '2. Hewan Agresif / Stres',
    body: 'Jika hewan menunjukkan perilaku agresif, sangat stres, atau ketakutan yang berlebihan, pihak Jeje Pet Care berhak menggunakan alat bantu keselamatan (handuk, hand gloves, muzzle, head cover, dan collar) atau menghentikan proses grooming sepihak demi keselamatan & kenyamanan hewan serta staff groomer. Biaya akan dikenakan secara proporsional.',
  },
  {
    title: '3. Resiko Bulu Gimbal (Matting)',
    body: 'Pemotongan atau penguraian bulu yang menggumpal/gimbal parah berisiko tinggi menyebabkan iritasi kulit, luka goresan kecil yang tidak sengaja, atau kemerahan.',
  },
  {
    title: '4. Kondisi Tak Terduga (Force Majeure)',
    body: 'Proses grooming melibatkan benda tajam (gunting/clipper) dan hewan yang bisa bergerak tiba-tiba. Jika terjadi cedera minor yang tidak disengaja, pihak groomer akan memberikan pertolongan pertama. Namun, jika terjadi kondisi darurat medis akibat penyakit bawaan hewan saat di-grooming, pemilik mengizinkan staf groomer untuk melakukan tindakan pertolongan pertama dengan biaya yang ditanggung oleh pemilik.',
  },
  {
    title: '5. Kutu dan Jamur',
    body: 'Jika saat pemeriksaan ditemukan kutu atau jamur yang belum dilaporkan, pihak groomer berhak mengalihkan jenis mandi ke Mandi Kutu/Jamur demi kebersihan dan mencegah penularan, dengan penyesuaian biaya.',
  },
  {
    title: '6. Batasan Pengambilan',
    body: 'Hewan yang selesai di-grooming harus diambil paling lambat hingga jam tutup operasional pada hari tersebut. Keterlambatan pengambilan tanpa konfirmasi akan dikenakan 1/2 dari biaya penitipan (daycare fee) sebesar Rp 20.000.',
  },
];

export const CONSENT_CHECKBOX_TEXT =
  '"Saya telah membaca, memahami, dan menyetujui seluruh ketentuan di atas. Saya memberikan izin penuh kepada Jeje Pet Care untuk melakukan tindakan grooming pada hewan peliharaan saya sesuai dengan layanan yang telah disepakati." *';

export function createDraftPet(
  id: string,
  packages: { name: string }[],
  vaccines: string[]
): DraftPet {
  return {
    id,
    petName: '',
    petType: 'Kucing',
    petBreed: '',
    petAge: '',
    petGender: 'Jantan',
    petVaccine: vaccines[0] || 'belum vaksin',
    healthNotes: '',
    specialPreferences: '',
    packageType: packages[0]?.name || 'Mandi Bersih (Basic)',
    selectedAddOns: [],
  };
}
