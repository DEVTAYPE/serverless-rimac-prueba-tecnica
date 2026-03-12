import { Appointment } from "@shared/domain/appointment";
import { IEventBridgePublisher } from "@shared/ports/event-bridge.publisher";
import { IScheduleRepository } from "@shared/ports/schedule.repository";
import { IAppointmentMessage } from "@shared/types";

/**
 * Caso de uso compartido: Procesar un agendamiento recibido desde SQS.
 *
 * Usado por appointment_pe y appointment_cl. Ambos ejecutan la misma lógica:
 * 1. Guardar el agendamiento en la base de datos MySQL del país (Strategy Pattern)
 * 2. Publicar evento AppointmentConfirmed a EventBridge
 *
 * Patrón Strategy: el comportamiento concreto lo determina el ScheduleRepository
 * inyectado (MySQLPEScheduleRepository vs MySQLCLScheduleRepository).
 *
 * Principio OCP: para agregar un nuevo país solo se agrega un nuevo adaptador,
 * sin modificar este caso de uso.
 *
 * TODO: Implementar envío de correo de confirmación al asegurado una vez que
 *       el agendamiento sea confirmado (fuera del alcance del reto).
 */
export class ProcessScheduleUseCase {
  constructor(
    private readonly scheduleRepository: IScheduleRepository,
    private readonly eventBridgePublisher: IEventBridgePublisher,
  ) {}

  async execute(message: IAppointmentMessage): Promise<void> {
    // Reconstruir entidad de dominio desde el mensaje SQS
    const appointment = Appointment.create(
      message.appointment_id,
      message.insured_id,
      message.schedule_id,
      message.country_iso,
    );

    // 1. Persistir en MySQL del país correspondiente (Strategy: PE o CL)
    await this.scheduleRepository.saveSchedule(appointment);

    // 2. Publicar evento de confirmación a EventBridge
    //    EventBridge enruta: appointment-confirmed → SQS confirmation → lambda appointment
    await this.eventBridgePublisher.publishConfirmation({
      appointment_id: message.appointment_id,
      insured_id: message.insured_id,
      country_iso: message.country_iso,
      confirmed_at: new Date().toISOString(),
    });
  }
}
