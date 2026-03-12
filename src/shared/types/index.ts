/* 
Codigos ISO para la app:
- PE: Peru
- CL: Chile
*/
export type TCountryISO = "PE" | "CL";

/* 
Estados de un agendamiento:
- pending: El agendamiento ha sido creado pero no se ha completado.
- completed: El agendamiento ha sido completado exitosamente.
*/
export type TAppointmentStatus = "pending" | "completed";

//  Payload de entrada para crear un nuevo agendamiento (POST /appointments).
//  insured: código del asegurado de 5 dígitos (puede tener ceros por delante)
//  schedule_id: identificador del espacio de cita (centro, especialidad, médico, fecha)
//  country_iso: país del asegurado (PE o CL)
export interface ICreateAppointmentRequest {
  insured_id: string;
  schedule_id: number;
  country_iso: TCountryISO;
}
