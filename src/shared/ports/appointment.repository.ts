import { Appointment } from "@shared/domain/appointment";

/* 
  prueto de interfaz para el repositorio de agendamientos.
*/
export interface IAppointmentRepository {
  // Guarda un nuevo agendamiento en DynamoDB con estado 'pending'
  save(appointment: Appointment): Promise<void>;

  // Busca todos los agendamientos asociados a un insured_id específico.
  // Usa el GSI 'insuredId-index' de DynamoDB.
  findByInsuredId(insured_id: string): Promise<Array<Appointment>>;

  // Actualiza el estado de un agendamiento existente (pending → completed).
  updateStatus(appointment_id: string, status: string): Promise<void>;
}
