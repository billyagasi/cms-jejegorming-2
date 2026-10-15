import type { Appointment, ClinicalPatientSnapshot, Inpatient, Reservation } from '../../types';

export interface ClinicalPatientOption extends ClinicalPatientSnapshot {
  key: string;
  label: string;
}

export function buildClinicalPatients(
  appointments: Appointment[],
  reservations: Reservation[],
  inpatients: Inpatient[] = []
): ClinicalPatientOption[] {
  const map = new Map<string, ClinicalPatientOption>();

  const add = (patient: ClinicalPatientSnapshot) => {
    const key = `${normalize(patient.ownerPhone)}::${patient.petName.trim().toLowerCase()}`;
    const current = map.get(key);
    const merged = { ...current, ...patient } as ClinicalPatientSnapshot;
    map.set(key, {
      ...merged,
      key,
      label: `${merged.petName} — ${merged.ownerName} (${merged.ownerPhone})`,
    });
  };

  appointments.forEach((appointment) => {
    appointment.pets.forEach((pet, index) => add({
      petName: pet.petName,
      petType: pet.petType,
      petBreed: pet.petBreed,
      ownerName: appointment.ownerName,
      ownerPhone: appointment.ownerPhone,
      appointmentId: appointment.id,
      appointmentPetIndex: index,
    }));
  });

  reservations.forEach((reservation) => add({
    petName: reservation.petName,
    petType: reservation.petType,
    petBreed: reservation.petBreed,
    ownerName: reservation.ownerName,
    ownerPhone: reservation.ownerPhone,
  }));

  inpatients.forEach((patient) => add({
    petName: patient.petName,
    petType: patient.petType,
    petBreed: patient.petBreed,
    ownerName: patient.ownerName,
    ownerPhone: patient.ownerPhone,
    appointmentId: patient.appointmentId,
    appointmentPetIndex: patient.appointmentPetIndex,
  }));

  return Array.from(map.values()).sort((a, b) => a.petName.localeCompare(b.petName, 'id'));
}

export function clinicalPatientKey(patient: ClinicalPatientSnapshot): string {
  return `${normalize(patient.ownerPhone)}::${patient.petName.trim().toLowerCase()}`;
}

function normalize(phone: string): string {
  return phone.replace(/\D/g, '');
}
