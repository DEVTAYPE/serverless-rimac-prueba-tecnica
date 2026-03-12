import { Appointment } from "@shared/domain/appointment";

/* 
 Puerto para agendamientos en MySQL RDS por país.
*/
export interface IScheduleRepository {
  // Guarda agendamiento en su db correspondiente
  save(appointment: Appointment): Promise<void>;
}
