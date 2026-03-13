import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetAppointmentsByInsuredUseCase } from "../../application/use-cases/get-appointments-by-insured.use-case";
import { DynamoAppointmentRepository } from "../repositories/dynamo-appointment.repository";

// Instanciación de caso de uso con su repositorio concreto (DynamoDB).
const repository = new DynamoAppointmentRepository();
const getAppointmentsByInsuredUseCase = new GetAppointmentsByInsuredUseCase(
  repository,
);

// Handler HTTP — GET /appointments/{insuredId}

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    // Segun requerimientos viene en camelCase
    const insured_id = event.pathParameters?.insuredId;

    if (!insured_id) {
      return buildResponse(400, {
        message: "El parámetro insuredId es requerido en la URL",
      });
    }

    const result = await getAppointmentsByInsuredUseCase.execute(insured_id);

    return buildResponse(200, result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";

    const isValidationError =
      error instanceof Error && message.includes("insured_id");

    return buildResponse(isValidationError ? 400 : 500, { message });
  }
};

// Para los responses HTTP, se estandariza el formato con esta función auxiliar.
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
