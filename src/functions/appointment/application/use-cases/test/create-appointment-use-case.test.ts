import { CreateAppointmentUseCase } from "../create-appointment.use-case";
import { IAppointmentRepository } from "../../../../../shared/ports/appointment.repository";
import { IEventPublisher } from "../../../../../shared/ports/event.publisher";

// Mocks de los ports — Principio DIP en acción: los tests tampoco dependen de infraestructura
const mockRepository: jest.Mocked<IAppointmentRepository> = {
  save: jest.fn(),
  findByInsuredId: jest.fn(),
  updateStatus: jest.fn(),
};

const mockPublisher: jest.Mocked<IEventPublisher> = {
  publish: jest.fn(),
};

// Mock de uuid para resultados deterministas en tests
jest.mock("uuid", () => ({ v4: () => "mock-uuid-1234" }));

describe("CreateAppointmentUseCase", () => {
  let useCase: CreateAppointmentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateAppointmentUseCase(mockRepository, mockPublisher);
  });

  describe("execute() — flujo exitoso", () => {
    test("debe guardar el agendamiento en DynamoDB con estado pending", async () => {
      await useCase.execute({
        insured_id: "00123",
        schedule_id: 100,
        country_iso: "PE",
      });

      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      const savedAppointment = mockRepository.save.mock.calls[0][0];
      expect(savedAppointment.status).toBe("pending");
      expect(savedAppointment.insured_id).toBe("00123");
      expect(savedAppointment.schedule_id).toBe(100);
      expect(savedAppointment.country_iso).toBe("PE");
    });

    test("debe publicar el mensaje a SNS con countryISO como atributo de filtro", async () => {
      await useCase.execute({
        insured_id: "00123",
        schedule_id: 100,
        country_iso: "PE",
      });

      expect(mockPublisher.publish).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publish).toHaveBeenCalledWith({
        appointment_id: "mock-uuid-1234",
        insured_id: "00123",
        schedule_id: 100,
        country_iso: "PE",
      });
    });

    test("debe retornar appointmentId, status pending y mensaje de confirmación", async () => {
      const result = await useCase.execute({
        insured_id: "00123",
        schedule_id: 100,
        country_iso: "CL",
      });

      expect(result).toEqual({
        appointment_id: "mock-uuid-1234",
        status: "pending",
        message: "Agendamiento en proceso",
      });
    });

    test("debe funcionar con countryISO CL", async () => {
      await useCase.execute({
        insured_id: "99999",
        schedule_id: 1,
        country_iso: "CL",
      });

      const savedAppointment = mockRepository.save.mock.calls[0][0];
      expect(savedAppointment.country_iso).toBe("CL");
    });
  });

  describe("execute() — validaciones de dominio", () => {
    test("debe lanzar error si insuredId tiene menos de 5 dígitos", async () => {
      await expect(
        useCase.execute({
          insured_id: "123",
          schedule_id: 1,
          country_iso: "PE",
        }),
      ).rejects.toThrow("insured_id debe ser un código de 5 dígitos numéricos");
    });

    test("debe lanzar error si insuredId tiene más de 5 dígitos", async () => {
      await expect(
        useCase.execute({
          insured_id: "123456",
          schedule_id: 1,
          country_iso: "PE",
        }),
      ).rejects.toThrow("insured_id debe ser un código de 5 dígitos numéricos");
    });

    test("debe lanzar error si insuredId contiene letras", async () => {
      await expect(
        useCase.execute({
          insured_id: "AB123",
          schedule_id: 1,
          country_iso: "PE",
        }),
      ).rejects.toThrow("insured_id debe ser un código de 5 dígitos numéricos");
    });

    test("debe aceptar insured_id con ceros por delante", async () => {
      await expect(
        useCase.execute({
          insured_id: "00001",
          schedule_id: 1,
          country_iso: "PE",
        }),
      ).resolves.not.toThrow();
    });

    test("debe lanzar error si schedule_id es cero", async () => {
      await expect(
        useCase.execute({
          insured_id: "00123",
          schedule_id: 0,
          country_iso: "PE",
        }),
      ).rejects.toThrow("schedule_id debe ser un número entero positivo");
    });

    test("debe lanzar error si schedule_id es negativo", async () => {
      await expect(
        useCase.execute({
          insured_id: "00123",
          schedule_id: -5,
          country_iso: "PE",
        }),
      ).rejects.toThrow("schedule_id debe ser un número entero positivo");
    });

    test("debe lanzar error si countryISO es inválido", async () => {
      await expect(
        useCase.execute({
          insured_id: "00123",
          schedule_id: 1,
          country_iso: "BR" as never,
        }),
      ).rejects.toThrow("country_iso solo acepta PE o CL");
    });

    test("no debe llamar a save ni publish si la validación falla", async () => {
      await expect(
        useCase.execute({
          insured_id: "123",
          schedule_id: 1,
          country_iso: "PE",
        }),
      ).rejects.toThrow();

      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockPublisher.publish).not.toHaveBeenCalled();
    });
  });
});
