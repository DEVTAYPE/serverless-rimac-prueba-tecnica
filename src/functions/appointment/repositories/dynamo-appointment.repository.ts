import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Appointment } from "@shared/domain/appointment";
import { IAppointmentRepository } from "@shared/ports/appointment.repository";

// Implementamos nuestro contrato
export class DynamoAppointmentRepository implements IAppointmentRepository {
  private readonly docClient: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION!,
    });

    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.DYNAMODB_TABLE || "";
  }

  save(appointment: Appointment): Promise<void> {
    throw new Error("Method not implemented.");
  }
  findByInsuredId(insured_id: string): Promise<Array<Appointment>> {
    throw new Error("Method not implemented.");
  }
  updateStatus(appointment_id: string, status: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
