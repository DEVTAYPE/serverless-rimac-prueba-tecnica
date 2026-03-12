import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Appointment } from "@shared/domain/appointment";
import { IAppointmentRepository } from "@shared/ports/appointment.repository";
import { TAppointmentStatus, TCountryISO } from "@shared/types";

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

  async save(appointment: Appointment): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          appointment_id: appointment.appointment_id,
          insured_id: appointment.insured_id,
          schedule_id: appointment.schedule_id,
          country_iso: appointment.country_iso,
          status: appointment.status,
          created_at: appointment.created_at,
          updated_at: appointment.updated_at,
        },

        // Evitar sobrescribir un agendamiento existente con el mismo ID
        ConditionExpression: "attribute_not_exists(appointment_id)",
      }),
    );
  }

  async findByInsuredId(insured_id: string): Promise<Array<Appointment>> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "insured_id-index",
        KeyConditionExpression: "insured_id = :insured_id",
        ExpressionAttributeValues: {
          ":insured_id": insured_id,
        },
      }),
    );

    return (result.Items ?? []).map(
      (item) =>
        new Appointment(
          item["appointment_id"] as string,
          item["insured_id"] as string,
          item["schedule_id"] as number,
          item["country_iso"] as TCountryISO,
          item["status"] as TAppointmentStatus,
          item["created_at"] as string,
          item["updated_at"] as string,
        ),
    );
  }

  async updateStatus(appointment_id: string, status: string): Promise<void> {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { appointment_id },
        UpdateExpression: "SET #status = :status, updated_at = :updated_at",
        ExpressionAttributeNames: {
          "#status": "status", // 'status' es palabra reservada en DynamoDB
        },
        ExpressionAttributeValues: {
          ":status": status,
          ":updated_at": new Date().toISOString(),
        },
        ConditionExpression: "attribute_exists(appointment_id)",
      }),
    );
  }
}
