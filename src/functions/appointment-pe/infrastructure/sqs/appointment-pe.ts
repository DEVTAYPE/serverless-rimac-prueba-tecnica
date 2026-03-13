import { SQSEvent, SQSRecord } from "aws-lambda";
import { MySQLPEScheduleRepository } from "../repositories/MySQL-PE-schedule.repository";
import { EventBridgeConfirmationPublisher } from "../messaging/event-bridge-confirmation.publisher";
import { ProcessScheduleUseCase } from "@shared/application/process-schedule.use-case";
import { IAppointmentMessage } from "@shared/types";

//  El mismo caso de uso recibe el adaptador MySQL de Perú.
//  Para Chile se usa MySQLCLScheduleRepository en su propio handler.

const repository = new MySQLPEScheduleRepository();
const eventBridgePublisher = new EventBridgeConfirmationPublisher();
const processScheduleUseCase = new ProcessScheduleUseCase(
  repository,
  eventBridgePublisher,
);

//  Handler SQS — appointment_pe
//
//  Consume mensajes de SQS_PE publicados por SNS (filtro countryISO=PE).
//  El cuerpo del record viene envuelto por SNS en el campo Message.
//
//  Flujo: SQS_PE → este handler → MySQL Perú → EventBridge (AppointmentConfirmed)

//  TODO: Implementar manejo de fallos parciales (reportFailures) para indicar a SQS qué mensajes fallaron sin descartar los exitosos del batch.

export const handler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    await processRecord(record);
  }
};

async function processRecord(record: SQSRecord): Promise<void> {
  // SNS envuelve el mensaje al publicar en SQS:
  // record.body = { "Type": "Notification", "Message": "<JSON string>" }
  const snsWrapper = JSON.parse(record.body) as { Message: string };
  const message = JSON.parse(snsWrapper.Message) as IAppointmentMessage;

  await processScheduleUseCase.execute(message);
}
