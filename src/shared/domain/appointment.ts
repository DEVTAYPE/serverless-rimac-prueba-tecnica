import type { TCountryISO, TAppointmentStatus } from "@shared/types";

// Dominio principal de la aplicación: Agendamiento
export class Appointment {
  constructor(
    public readonly appointment_id: string,
    public readonly insured_id: string,
    public readonly schedule_id: number,
    public readonly country_ISO: TCountryISO,
    public status: TAppointmentStatus, // Se deja sin readonly para poder actualizar el estado del agendamiento
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}

  // para crear un nuevo agendamiento, con estado pending
  static create(
    appointment_id: string,
    insured_id: string,
    schedule_id: number,
    country_ISO: TCountryISO,
  ): Appointment {
    const now = new Date();
    return new Appointment(
      appointment_id,
      insured_id,
      schedule_id,
      country_ISO,
      "pending",
      now,
      now,
    );
  }

  // para completar un agendamiento
  complete(): void {
    this.status = "completed";
    this.updated_at = new Date();
  }
}
