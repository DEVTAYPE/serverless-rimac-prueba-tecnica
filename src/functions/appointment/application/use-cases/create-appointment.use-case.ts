import { ICreateAppointmentRequest } from "@shared/types";

export interface ICreateAppointmentResponse {
  appointment_id: string;
  status: string;
  message: string;
}

export class CreateAppointmentUseCase {
  execute(
    request: ICreateAppointmentRequest,
  ): Promise<ICreateAppointmentResponse> {
    // 1. Validar el payload de entrada
    this.validate(request);

    // todo: implementar mas logica
    throw new Error("Method not implemented.");
  }

  //  Validaciones de dominio básicas.
  //  insured_id: exactamente 5 dígitos (puede tener ceros por delante)
  //  schedule_id: debe ser un número entero positivo
  //  country_iso: solo PE o CL

  private validate(request: ICreateAppointmentRequest): void {
    if (!/^\d{5}$/.test(request.insured_id)) {
      throw new Error("insured_id debe ser un código de 5 dígitos numéricos");
    }

    if (!Number.isInteger(request.schedule_id) || request.schedule_id <= 0) {
      throw new Error("schedule_id debe ser un número entero positivo");
    }

    if (!["PE", "CL"].includes(request.country_iso)) {
      throw new Error("country_iso solo acepta PE o CL");
    }
  }
}
