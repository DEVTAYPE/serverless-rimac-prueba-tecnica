import type { TCountryISO, TAppointmentStatus } from "@shared/types";

// Dominio principal de la aplicación: Agendamiento
export class Appointment {
  constructor(
    public readonly appointment_id: string,
    public readonly insured_id: string,
    public readonly schedule_id: number,
    public readonly country_iso: TCountryISO,
    public status: TAppointmentStatus, // Se deja sin readonly para poder actualizar el estado del agendamiento
    public readonly created_at: string,
    public updated_at: string,
  ) {}

  // para crear un nuevo agendamiento, con estado pending
  static create(
    appointment_id: string,
    insured_id: string,
    schedule_id: number,
    country_iso: TCountryISO,
  ): Appointment {
    const now = new Date().toISOString();

    return new Appointment(
      appointment_id,
      insured_id,
      schedule_id,
      country_iso,
      "pending",
      now,
      now,
    );
  }

  // para completar un agendamiento
  complete(): void {
    this.status = "completed";
    this.updated_at = new Date().toISOString();
  }
}
