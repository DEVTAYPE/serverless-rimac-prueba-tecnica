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
  try {
    console.log("=== Mensaje recibido de SQS ===");
    console.log(record.body);

    const body = JSON.parse(record.body);

    // IMPORTANTE: EventBridge pone la data en 'detail'
    const confirmedEvent = body.detail;

    if (!confirmedEvent || !confirmedEvent.appointment_id) {
      console.error("Error: El evento no tiene appointment_id", confirmedEvent);
      return;
    }

    console.log("Ejecutando Use Case para ID:", confirmedEvent.appointment_id);
    await completeAppointmentUseCase.execute(confirmedEvent);

    console.log("Cita completada con éxito en DynamoDB");
  } catch (error) {
    console.error("Error procesando record de confirmación:", error);
    // Re-lanzamos para que SQS sepa que falló
    throw error;
  }
}
