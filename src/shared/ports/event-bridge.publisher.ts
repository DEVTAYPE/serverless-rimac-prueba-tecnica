import { IAppointmentConfirmedEvent } from "@shared/types";

//  Los lambdas appointment_pe y appointment_cl usan este puerto
//  para notificar que el agendamiento fue procesado exitosamente.
//  EventBridge enruta el evento 'appointment_confirmed' → SQS de confirmación
//  → lambda appointment actualiza DynamoDB a 'completed'.
//
//        una vez que el evento appointment_confirmed sea procesado.
//  TODO: plus si da tiempo - implementar envío de correo de confirmación al asegurado
export interface IEventBridgePublisher {
  //  Publica un evento appointment_confirmed al bus de eventos default.

  publishConfirmation(event: IAppointmentConfirmedEvent): Promise<void>;
}
