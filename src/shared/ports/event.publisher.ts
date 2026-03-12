import { IAppointmentMessage } from "@shared/types";

// Interfaz para el publicador de eventos (SNS).
export interface IEventPublisher {
  // Publica un mensaje al tópico SNS.
  publish(message: IAppointmentMessage): Promise<void>;
}
