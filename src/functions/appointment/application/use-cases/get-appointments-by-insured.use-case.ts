import { Appointment } from "@shared/domain/appointment";
import { IAppointmentRepository } from "@shared/ports/appointment.repository";

export interface IGetAppointmentsResponse {
  insured_id: string;
  appointments: {
    appointment_id: string;
    insured_id: string;
    schedule_id: number;
    country_iso: string;
    status: string;
    created_at: string;
    updated_at: string;
  }[];
}

// Caso de uso: Recuperar todos los agendamientos de un asegurado.

//  solo se encarga de consultar y proyectar los datos.
//  depende del port AppointmentRepository, no de DynamoDB directamente.
export class GetAppointmentsByInsuredUseCase {
  constructor(private readonly appointmentRepository: IAppointmentRepository) {}

  async execute(insured_id: string): Promise<IGetAppointmentsResponse> {
    this.validate(insured_id);

    const appointments: Appointment[] =
      await this.appointmentRepository.findByInsuredId(insured_id);

    return {
      insured_id,
      appointments: appointments.map((a) => ({
        appointment_id: a.appointment_id,
        insured_id: a.insured_id,
        schedule_id: a.schedule_id,
        country_iso: a.country_iso,
        status: a.status,
        created_at: a.created_at,
        updated_at: a.updated_at,
      })),
    };
  }

  // Valida que el insured_id tenga exactamente 5 dígitos numéricos.
  private validate(insured_id: string): void {
    if (!/^\d{5}$/.test(insured_id)) {
      throw new Error("insured_id debe ser un código de 5 dígitos numéricos");
    }
  }
}
