import { Appointment } from "./appointment";

describe("Appointment Entity", () => {
  const fixedId = "test-uuid-1234";
  const insuredId = "00123";
  const scheduleId = 100;

  describe("create()", () => {
    test("debe crear un agendamiento con estado pending", () => {
      const appointment = Appointment.create(
        fixedId,
        insuredId,
        scheduleId,
        "PE",
      );

      expect(appointment.appointment_id).toBe(fixedId);
      expect(appointment.insured_id).toBe(insuredId);
      expect(appointment.schedule_id).toBe(scheduleId);
      expect(appointment.country_iso).toBe("PE");
      expect(appointment.status).toBe("pending");
    });

    test("debe asignar created_at y updated_at iguales al momento de creación", () => {
      const before = new Date().toISOString();
      const appointment = Appointment.create(
        fixedId,
        insuredId,
        scheduleId,
        "CL",
      );
      const after = new Date().toISOString();

      expect(appointment.created_at >= before).toBe(true);
      expect(appointment.created_at <= after).toBe(true);
      expect(appointment.created_at).toBe(appointment.updated_at);
    });

    test("debe soportar countryISO CL", () => {
      const appointment = Appointment.create(
        fixedId,
        insuredId,
        scheduleId,
        "CL",
      );
      expect(appointment.country_iso).toBe("CL");
    });
  });

  describe("complete()", () => {
    test("debe cambiar el estado de pending a completed", () => {
      const appointment = Appointment.create(
        fixedId,
        insuredId,
        scheduleId,
        "PE",
      );
      expect(appointment.status).toBe("pending");

      appointment.complete();

      expect(appointment.status).toBe("completed");
    });

    test("debe actualizar updated_at al completar", () => {
      const appointment = Appointment.create(
        fixedId,
        insuredId,
        scheduleId,
        "PE",
      );
      const createdAt = appointment.created_at;

      // Pequeña espera para garantizar diferencia en timestamp
      jest.useFakeTimers();
      jest.setSystemTime(new Date(Date.now() + 1000));

      appointment.complete();

      expect(appointment.updated_at).not.toBe(createdAt);

      jest.useRealTimers();
    });

    test("no debe modificar created_at al completar", () => {
      const appointment = Appointment.create(
        fixedId,
        insuredId,
        scheduleId,
        "PE",
      );
      const originalCreatedAt = appointment.created_at;

      appointment.complete();

      expect(appointment.created_at).toBe(originalCreatedAt);
    });
  });

  describe("constructor", () => {
    test("debe construir correctamente desde campos existentes", () => {
      const now = new Date().toISOString();
      const appointment = new Appointment(
        fixedId,
        insuredId,
        scheduleId,
        "PE",
        "completed",
        now,
        now,
      );

      expect(appointment.status).toBe("completed");
      expect(appointment.appointment_id).toBe(fixedId);
    });
  });
});
