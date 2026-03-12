import { Appointment } from "@shared/domain/appointment";
import { IAppointmentRepository } from "@shared/ports/appointment.repository";
import { IEventPublisher } from "@shared/ports/event.publisher";
import { ICreateAppointmentRequest } from "@shared/types";
import { v4 as uuidv4 } from "uuid";

export interface ICreateAppointmentResponse {
  appointment_id: string;
  status: string;
  message: string;
}

export class CreateAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(
    request: ICreateAppointmentRequest,
  ): Promise<ICreateAppointmentResponse> {
    // 1. Validar el payload de entrada
    this.validate(request);

    const appointment_id = uuidv4(); // Generar un ID único para el agendamiento

    // Crear objeto de dominio Appointment
    const appointment = Appointment.create(
      appointment_id,
      request.insured_id,
      request.schedule_id,
      request.country_iso,
      // Por defecto tiene estado pending
    );

    // Guardar el agendamiento
    this.appointmentRepository.save(appointment);

    await this.eventPublisher.publish({
      appointment_id,
      insured_id: request.insured_id,
      schedule_id: request.schedule_id,
      country_iso: request.country_iso,
    });

    return {
      appointment_id,
      status: appointment.status,
      message: "Agendamiento en proceso",
    };
  }

  //  Validaciones de dominio básicas.
  //  insured_id: exactamente 5 dígitos (puede tener ceros por delante)
  //  schedule_id: debe ser un número entero positivo
  //  country_iso: solo PE o CL

  private validate(request: ICreateAppointmentRequest): void {
    if (!/^\d{5}$/.test(request.insured_id)) {
      throw new Error("insured_id debe ser un código de 5 dígitos numéricos");
    }

    if (!Number.isInteger(request.schedule_id) || request.schedule_id <= 0) {
      throw new Error("schedule_id debe ser un número entero positivo");
    }

    if (!["PE", "CL"].includes(request.country_iso)) {
      throw new Error("country_iso solo acepta PE o CL");
    }
  }
}
