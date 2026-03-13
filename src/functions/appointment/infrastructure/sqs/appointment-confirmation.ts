import { SQSEvent, SQSRecord } from "aws-lambda";
import { DynamoAppointmentRepository } from "../repositories/dynamo-appointment.repository";
import { CompleteAppointmentUseCase } from "../../application/use-cases/complete-appointment.use-case";
import { IAppointmentConfirmedEvent } from "@shared/types";

// Composición de dependencias reutilizada entre invocaciones tibias.
const repository = new DynamoAppointmentRepository();
const completeAppointmentUseCase = new CompleteAppointmentUseCase(repository);

//  Handler SQS — Consumidor de la cola de confirmación.

//  Flujo completo que cierra el ciclo:
//  appointment_pe/cl → EventBridge (AppointmentConfirmed)
//  → EventBridge Rule → SQS confirmation
//  → este handler → DynamoDB status: pending → completed

//  El body del record viene envuelto por EventBridge en el campo "detail".

//  TODO: Implementar manejo de fallos parciales (reportFailures) para indicar a SQS qué mensajes fallaron sin descartar los exitosos del batch.

export const handler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    await processRecord(record);
  }
};

async function processRecord(record: SQSRecord): Promise<void> {
  // EventBridge envuelve el evento al publicar en SQS:
  // record.body = { "source": "rimac.appointment", "detail-type": "AppointmentConfirmed", "detail": {...} }
  const eventBridgeWrapper = JSON.parse(record.body) as {
    detail: IAppointmentConfirmedEvent;
  };
  const confirmedEvent = eventBridgeWrapper.detail;

  await completeAppointmentUseCase.execute(confirmedEvent);
}
