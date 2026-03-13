import { IAppointmentRepository } from "@shared/ports/appointment.repository";
import { IAppointmentConfirmedEvent } from "@shared/types";

//  Caso de uso: Completar un agendamiento al recibir la confirmación desde EventBridge.

//  Es invocado por el handler SQS de confirmación:  EventBridge → SQS confirmation → este caso de uso → DynamoDB status=completed

//  Principio SRP: solo actualiza el estado. No publica ni persiste en MySQL.
//  Principio DIP: depende del port AppointmentRepository, no de DynamoDB directamente.

export class CompleteAppointmentUseCase {
  constructor(private readonly appointmentRepository: IAppointmentRepository) {}

  async execute(event: IAppointmentConfirmedEvent): Promise<void> {
    await this.appointmentRepository.updateStatus(
      event.appointment_id,
      "completed",
    );
  }
}
