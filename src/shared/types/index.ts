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
