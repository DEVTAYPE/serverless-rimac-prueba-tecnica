import { Appointment } from "@shared/domain/appointment";
import { IScheduleRepository } from "@shared/ports/schedule.repository";
import * as mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";

// Adaptador MySQL para Perú — implementa ScheduleRepository.

//  Patrón Strategy: esta clase es la implementación concreta para PE.
//  Conecta al RDS MySQL de Perú mediante variables de entorno DB_PE_*.

//  appointments (RDS PE)

export class MySQLPEScheduleRepository implements IScheduleRepository {
  private readonly pool: Pool;

  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_PE_HOST!,
      port: Number(process.env.DB_PE_PORT! ?? 3306),
      user: process.env.DB_PE_USER!,
      password: process.env.DB_PE_PASSWORD!,
      database: process.env.DB_PE_NAME!,
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 10000,
    });
  }

  //  Persiste el agendamiento en la base de datos MySQL de Perú.
  //  Usa INSERT IGNORE para evitar duplicados en caso de reintentos del SQS.

  async saveSchedule(appointment: Appointment): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.execute(
        `INSERT IGNORE INTO appointments
          (appointment_id, insured_id, schedule_id, country_iso, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          appointment.appointment_id,
          appointment.insured_id,
          appointment.schedule_id,
          appointment.country_iso,
          appointment.status,
          appointment.created_at,
          appointment.updated_at,
        ],
      );
    } finally {
      connection.release();
    }
  }
}
