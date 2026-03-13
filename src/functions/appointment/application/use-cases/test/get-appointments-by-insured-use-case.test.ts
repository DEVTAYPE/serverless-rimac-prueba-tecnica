import { Appointment } from "../../../../../shared/domain/appointment";
import { IAppointmentRepository } from "../../../../../shared/ports/appointment.repository";
import { GetAppointmentsByInsuredUseCase } from "../../use-cases/get-appointments-by-insured.use-case";

const mockRepository: jest.Mocked<IAppointmentRepository> = {
  save: jest.fn(),
  findByInsuredId: jest.fn(),
  updateStatus: jest.fn(),
};

describe("GetAppointmentsByInsuredUseCase", () => {
  let useCase: GetAppointmentsByInsuredUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetAppointmentsByInsuredUseCase(mockRepository);
  });

  describe("execute() — validaciones", () => {
    test("debe lanzar error si insured_id tiene menos de 5 dígitos", async () => {
      await expect(useCase.execute("123")).rejects.toThrow(
        "insured_id debe ser un código de 5 dígitos numéricos", // Antes: insured_id
      );
    });

    test("debe lanzar error si insured_id contiene letras", async () => {
      await expect(useCase.execute("AB123")).rejects.toThrow(
        "insured_id debe ser un código de 5 dígitos numéricos", // Antes: insured_id
      );
    });

    test("debe retornar lista vacía si el asegurado no tiene agendamientos", async () => {
      mockRepository.findByInsuredId.mockResolvedValue([]);

      const result = await useCase.execute("00123");

      expect(result.insured_id).toBe("00123");
      expect(result.appointments).toHaveLength(0);
    });

    test("debe llamar a findByInsured_id con el insured_id correcto", async () => {
      mockRepository.findByInsuredId.mockResolvedValue([]);

      await useCase.execute("00999");

      expect(mockRepository.findByInsuredId).toHaveBeenCalledWith("00999");
    });

    test("debe proyectar todos los campos del agendamiento en la respuesta", async () => {
      const now = new Date().toISOString();
      mockRepository.findByInsuredId.mockResolvedValue([
        new Appointment("uuid-1", "00123", 100, "CL", "pending", now, now),
      ]);

      const result = await useCase.execute("00123");
      const appointment = result.appointments[0];

      expect(appointment).toEqual({
        appointment_id: "uuid-1",
        insured_id: "00123",
        schedule_id: 100,
        country_iso: "CL",
        status: "pending",
        created_at: now,
        updated_at: now,
      });
    });
  });

  describe("execute() — validaciones", () => {
    test("debe lanzar error si insured_id tiene menos de 5 dígitos", async () => {
      await expect(useCase.execute("123")).rejects.toThrow(
        "insured_id debe ser un código de 5 dígitos numéricos",
      );
    });

    test("debe lanzar error si insured_id contiene letras", async () => {
      await expect(useCase.execute("AB123")).rejects.toThrow(
        "insured_id debe ser un código de 5 dígitos numéricos",
      );
    });

    test("no debe llamar al repositorio si la validación falla", async () => {
      await expect(useCase.execute("ABC")).rejects.toThrow();
      expect(mockRepository.findByInsuredId).not.toHaveBeenCalled();
    });
  });
});
