import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { IEventBridgePublisher } from "@shared/ports/event-bridge.publisher";
import { IAppointmentConfirmedEvent } from "@shared/types";

//  Adaptador EventBridge para appointment_cl.
//
//  Publica el evento 'appointment_confirmed' al bus de eventos default de AWS.
//  EventBridge enruta el evento mediante la regla appointment_confirmedRule
//  hacia la SQS de confirmación, donde el lambda 'appointment' lo consume
//  para actualizar el estado en DynamoDB a 'completed'.
//
//  source: "rimac.appointment"
//  detail-type: "appointment_confirmed"
//
export class EventBridgeConfirmationPublisher implements IEventBridgePublisher {
  private readonly client: EventBridgeClient;

  constructor() {
    this.client = new EventBridgeClient({
      region: process.env.REGION ?? "us-east-1",
    });
  }

  async publishConfirmation(event: IAppointmentConfirmedEvent): Promise<void> {
    await this.client.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: "rimac.appointment",
            DetailType: "appointment_confirmed",
            Detail: JSON.stringify(event),
            EventBusName: "default",
          },
        ],
      }),
    );
  }
}
