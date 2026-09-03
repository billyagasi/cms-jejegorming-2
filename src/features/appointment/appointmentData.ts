import { AppointmentPet, PetType } from '../../types';

export const ACCOMMODATIONS = ['Pet Taxi', 'Pet Ojek', 'Diantar Sendiri', 'Diantar Kerabat/Keluarga'] as const;

/** Batas maksimal alasan kunjungan per hewan */
export const MAX_REASONS = 2;

/** Batas maksimal hewan per booking appointment */
export const MAX_PETS = 2;

export interface DraftApptPet {
  petName: string;
  petType: PetType;
  petBreed: string;
  petAge: string;
  petGender: string;
  petVaccine: string;
  healthNotes: string;
  reasons: string[];
  conditionStory: string;
  complaints: { name: string; detail: string }[];
  preVisitAnswers: { question: string; answer: string }[];
}

export function createDraftApptPet(vaccines: string[]): DraftApptPet {
  return {
    petName: '',
    petType: 'Kucing',
    petBreed: '',
    petAge: '',
    petGender: 'Jantan',
    petVaccine: vaccines[0] || 'belum vaksin',
    healthNotes: '',
    reasons: [],
    conditionStory: '',
    complaints: [],
    preVisitAnswers: [],
  };
}

export function toApptPet(draft: DraftApptPet): AppointmentPet {
  return {
    petName: draft.petName.trim(),
    petType: draft.petType,
    petBreed: draft.petBreed.trim() || 'Domestik / Mix',
    petAge: draft.petAge.trim() || 'Belum diketahui',
    petGender: draft.petGender,
    petVaccine: draft.petVaccine,
    healthNotes: draft.healthNotes.trim() || '-',
    reasons: draft.reasons,
    conditionStory: draft.conditionStory.trim(),
    complaints: draft.complaints,
    preVisitAnswers: draft.preVisitAnswers.filter((a) => a.answer.trim() !== ''),
    treatments: [],
  };
}
