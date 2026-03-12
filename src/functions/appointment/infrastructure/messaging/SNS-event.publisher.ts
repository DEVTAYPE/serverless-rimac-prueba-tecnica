import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { IEventPublisher } from "@shared/ports/event.publisher";
import { IAppointmentMessage } from "@shared/types";

// Crear SNS logica
/* 
El mensaje se publica con un MessageAttribute 'countryISO' que actúa como
filtro de suscripción en el tópico SNS:
  countryISO = PE → SQS_PE
  countryISO = CL → SQS_CL
*/
export class SNSEventPublisher implements IEventPublisher {
  private readonly snsClient: SNSClient;
  private readonly topicArn: string;

  constructor() {
    this.snsClient = new SNSClient({
      region: process.env.REGION ?? "us-east-1",
    });
    // ARN DEL TOPIC
    this.topicArn = process.env.SNS_TOPIC_ARN ?? "";
  }

  // Publica el mensaje de agendamiento al tópico SNS.
  // El atributo 'country_iso' es usado por los filtros de suscripción SNS
  // para enrutar el mensaje al SQS del país correspondiente.

  async publish(message: IAppointmentMessage): Promise<void> {
    await this.snsClient.send(
      new PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify(message),
        MessageAttributes: {
          // Atributo de filtro: SNS usa este valor para enrutar al SQS correcto
          country_iso: {
            DataType: "String",
            StringValue: message.country_iso,
          },
        },
      }),
    );
  }
}
