import { Appointment } from "@shared/domain/appointment";

/* 
 Puerto para agendamientos en MySQL RDS por país.
*/
export interface IScheduleRepository {
  // Guarda agendamiento en su db correspondiente
  saveSchedule(appointment: Appointment): Promise<void>;
}
