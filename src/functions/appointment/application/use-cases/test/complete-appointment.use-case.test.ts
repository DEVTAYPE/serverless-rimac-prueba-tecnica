import { CompleteAppointmentUseCase } from "../complete-appointment.use-case";
import { IAppointmentRepository } from "../../../../../shared/ports/appointment.repository";

const mockRepository: jest.Mocked<IAppointmentRepository> = {
  save: jest.fn(),
  findByInsuredId: jest.fn(),
  updateStatus: jest.fn(),
};

describe("CompleteAppointmentUseCase", () => {
  let useCase: CompleteAppointmentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CompleteAppointmentUseCase(mockRepository);
  });

  describe("execute()", () => {
    it("debe llamar a updateStatus con el appointmentId y estado completed", async () => {
      const confirmedEvent = {
        appointment_id: "uuid-1",
        insured_id: "00123",
        country_iso: "PE" as const,
        confirmed_at: new Date().toISOString(),
      };

      await useCase.execute(confirmedEvent);

      expect(mockRepository.updateStatus).toHaveBeenCalledTimes(1);
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        "uuid-1",
        "completed",
      );
    });

    it("debe funcionar con evento de país CL", async () => {
      const confirmedEvent = {
        appointment_id: "uuid-cl-99",
        insured_id: "99999",
        country_iso: "CL" as const,
        confirmed_at: new Date().toISOString(),
      };

      await useCase.execute(confirmedEvent);

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        "uuid-cl-99",
        "completed",
      );
    });

    it("debe propagar errores del repositorio", async () => {
      mockRepository.updateStatus.mockRejectedValue(
        new Error("DynamoDB connection error"),
      );

      await expect(
        useCase.execute({
          appointment_id: "uuid-1",
          insured_id: "00123",
          country_iso: "PE",
          confirmed_at: new Date().toISOString(),
        }),
      ).rejects.toThrow("DynamoDB connection error");
    });
  });
});
