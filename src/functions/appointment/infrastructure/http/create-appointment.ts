import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoAppointmentRepository } from "../repositories/dynamo-appointment.repository";
import { SNSEventPublisher } from "../messaging/SNS-event.publisher";
import { CreateAppointmentUseCase } from "../../application/use-cases/create-appointment.use-case";
import { ICreateAppointmentRequest, TCountryISO } from "@shared/types";

// Se instancian una vez fuera del handler para reutilizarlas entre invocaciones
//  tibias (warm Lambda), reduciendo latencia en llamadas repetidas.

const repository = new DynamoAppointmentRepository();
const publisher = new SNSEventPublisher();
const createAppointmentUseCase = new CreateAppointmentUseCase(
  repository,
  publisher,
);

//  Handler HTTP — POST /appointments

//  Recibe la solicitud de agendamiento, valida el body y delega al caso de uso.
//  Responde con 202 Accepted indicando que el proceso está en curso.
export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return buildResponse(400, {
        message: "El body de la solicitud es requerido",
      });
    }

    let body: any;
    // let body: Partial<ICreateAppointmentRequest>;

    try {
      body = JSON.parse(event.body) as Partial<ICreateAppointmentRequest>;
    } catch {
      return buildResponse(400, { message: "El body debe ser un JSON válido" });
    }

    const {
      insuredId: insured_id,
      scheduleId: schedule_id,
      countryISO: country_iso,
    } = body;

    if (!insured_id || schedule_id === undefined || !country_iso) {
      return buildResponse(400, {
        message: "Los campos insuredId, scheduleId y countryISO son requeridos",
      });
    }

    const result = await createAppointmentUseCase.execute({
      country_iso: country_iso as TCountryISO,
      insured_id,
      schedule_id: Number(schedule_id),
    });

    return buildResponse(202, result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";

    // Errores de validación de dominio → 400
    const isValidationError =
      error instanceof Error &&
      (message.includes("insured_id") ||
        message.includes("schedule_id") ||
        message.includes("country_iso"));

    return buildResponse(isValidationError ? 400 : 500, { message });
  }
};

function buildResponse(
  statusCode: number,
  body: unknown,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}
