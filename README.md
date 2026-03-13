# Rimac Appointment — Backend Serverless

Backend de agendamiento de citas médicas para asegurados, desarrollado con **AWS Serverless Framework**, **TypeScript** y **Node.js 20**.

---

## Tabla de contenidos

- [Descripción](#descripción)
- [Despliegue](#despliegue)
- [Probar endpoints](#probar-los-endpoints)
- [Arquitectura](#arquitectura)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Requisitos previos](#requisitos-previos)
- [Instalación](#instalación)
- [Variables de entorno](#variables-de-entorno)
- [Documentación API (Swagger)](#documentación-api-swagger)
- [Flujo técnico](#flujo-técnico)
- [Base de datos](#base-de-datos)
- [Pruebas](#pruebas)

---

## Despliegue

Para realizar un despliegue en AWS, siga las instrucciones del archivo de deploy en [AWS DEPLOY](./AWS-DEPLOY.md).

---

## Probar los endpoints

> Puedes usar **curl**, **Postman** o el archivo `swagger.yml` en [editor.swagger.io](https://editor.swagger.io).

### POST /appointments (crear agendamiento)

#### Caso Perú (PE):

```bash
curl -X POST "https://ss4lktwio5.execute-api.us-east-1.amazonaws.com/dev/appointments/" \
  -H "Content-Type: application/json" \
  -d '{
    "insuredId": "00123",
    "scheduleId": 1,
    "countryISO": "PE"
  }'
```

**Respuesta esperada (202 Accepted):**

```json
{
  "appointment_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "pending",
  "message": "Agendamiento en proceso"
}
```

#### Caso Chile (CL):

```bash
curl -X POST "https://ss4lktwio5.execute-api.us-east-1.amazonaws.com/dev/appointments/" \
  -H "Content-Type: application/json" \
  -d '{
    "insuredId": "00456",
    "scheduleId": 7,
    "countryISO": "CL"
  }'
```

#### Casos de error — validaciones 400:

```bash
# Sin body
curl -X POST "https://ss4lktwio5.execute-api.us-east-1.amazonaws.com/dev/appointments/" \
  -H "Content-Type: application/json"

# Sin insuredId
curl -X POST "https://ss4lktwio5.execute-api.us-east-1.amazonaws.com/dev/appointments/" \
  -H "Content-Type: application/json" \
  -d '{"scheduleId": 1, "countryISO": "PE"}'

# insuredId inválido (menos de 5 dígitos)
curl -X POST "https://ss4lktwio5.execute-api.us-east-1.amazonaws.com/dev/appointments/" \
  -H "Content-Type: application/json" \
  -d '{"insuredId": "123", "scheduleId": 1, "countryISO": "PE"}'
```

---

### GET /appointments/{insuredId} (listar agendamientos)

```bash
# Listar agendamientos del asegurado 00123
curl "https://ss4lktwio5.execute-api.us-east-1.amazonaws.com/dev/appointments/00123"
```

**Respuesta esperada (200 OK) — justo después de crear:**

```json
{
  "insuredId": "00123",
  "appointments": [
    {
      "appointment_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "insured_id": "00123",
      "schedule_id": 1,
      "country_iso": "PE",
      "status": "pending",
      "created_ay": "2026-03-12T10:00:00.000Z",
      "updated_ay": "2026-03-12T10:00:00.000Z"
    }
  ]
}
```

**Una vez que el procesamiento async completa (~2-5 segundos), el status cambia a `completed`:**

```json
{
  "status": "completed",
  "updated_at": "2026-03-12T10:00:03.000Z"
}
```

#### Casos de error — validaciones 400:

```bash
# insuredId ausente en el path (ruta incorrecta)
curl "https://ss4lktwio5.execute-api.us-east-1.amazonaws.com/dev/appointments/"

# insuredId no existe en DynamoDB — retorna lista vacía, no error
curl "https://ss4lktwio5.execute-api.us-east-1.amazonaws.com/dev/appointments/99999"
```

## Descripción

Un asegurado puede agendar una cita médica seleccionando centro médico, especialidad, médico y fecha/hora. La aplicación funciona para **Perú (PE)** y **Chile (CL)**, con procesamiento asíncrono por país.

---

## Arquitectura

**Patrón:** Arquitectura Hexagonal (Ports & Adapters)  
**Principios:** SOLID (SRP, DIP, OCP)  
**Patrones de diseño:** Repository, Strategy (por país), Factory Method

```
Aplicación web
      │
      ▼
 API Gateway
      │
      ▼ (1) POST /appointments
 Lambda: appointment ──────────────────────► DynamoDB (status: pending)
      │                                            ▲
      │ (2) Publica SNS (filtro countryISO)        │ (6) Actualiza → completed
      ▼                                            │
     SNS ◄──────────── filtro PE / CL             │
      │                                            │
   ┌──┴──┐                                         │
   ▼     ▼                                         │
SQS_PE  SQS_CL  (3)                               │
   │     │                                         │
   ▼     ▼  (4)                           SQS confirmation ◄── EventBridge
appointment_pe / appointment_cl                    │
   │     │                                         │
   ▼     ▼                                         │
MySQL_PE / MySQL_CL                                │
   │     │                                         │
   └──┬──┘ (5) Publica AppointmentConfirmed        │
      └──────────────────► EventBridge ────────────┘
```

---

## Estructura del proyecto

````
serverless-reto-rimac/
├── src/
│   ├── shared/                              # Dominio compartido entre funciones
│   │   ├── types/
│   │   │   └── index.ts                     # CountryISO, AppointmentStatus, DTOs
│   │   ├── application/
│   │   │   └── process_schedule_use_case.ts # Caso de uso compartido PE/CL (Strategy)
│   │   └── domain/
│   │       ├── entities/
│   │       │   └── appointment.ts           # Entidad central del dominio
│   │       └── ports/                       # Interfaces (contratos) — Principio DIP
│   │           ├── appointment_repository.ts    # Port DynamoDB
│   │           ├── schedule_repository.ts       # Port MySQL (Strategy PE/CL)
│   │           ├── event_publisher.ts           # Port SNS
│   │           └── event_bridge_publisher.ts    # Port EventBridge
│   │
│   └── functions/                           # Una carpeta por Lambda
│       ├── appointment/                     # Lambda principal (HTTP + SQS consumer)
│       │   ├── application/
│       │   │   └── use-cases/
│       │   │       ├── create_appointment_use_case.ts           # POST: guarda en DynamoDB + publica SNS
│       │   │       ├── get_appointments_by_insured_use_case.ts  # GET: consulta DynamoDB
│       │   │       └── complete_appointment_use_case.ts         # Actualiza DynamoDB a completed
│       │   └── infrastructure/
│       │       ├── http/
│       │       │   ├── create_appointment.ts   # Handler POST /appointments
│       │       │   └── get_appointments.ts     # Handler GET /appointments/{insuredId}
│       │       ├── repositories/
│       │       │   └── dynamo_appointment_repository.ts  # Adapter DynamoDB
│       │       ├── messaging/
│       │       │   └── sns_event_publisher.ts  # Adapter SNS con filtro countryISO
│       │       └── sqs/
│       │           └── appointment_confirmation.ts  # Consume SQS confirmation → DynamoDB completed
│       ├── appointment-pe/                  # Lambda consumidor SQS Perú
│       │   └── infrastructure/
│       │       ├── repositories/
│       │       │   └── mysql_pe_schedule_repository.ts       # Adapter MySQL Perú (Strategy)
│       │       ├── messaging/
│       │       │   └── event_bridge_confirmation_publisher.ts # Publica AppointmentConfirmed
│       │       └── sqs/
│       │           └── appointment_pe.ts    # Handler SQS_PE
│       └── appointment-cl/                  # Lambda consumidor SQS Chile
│           └── infrastructure/
│               ├── repositories/
│               │   └── mysql_cl_schedule_repository.ts       # Adapter MySQL Chile (Strategy)
│               ├── messaging/
│               │   └── event_bridge_confirmation_publisher.ts # Publica AppointmentConfirmed
│               └── sqs/
│                   └── appointment_cl.ts    # Handler SQS_CL
│
├── serverless.yml      # IaC: API GW, Lambdas, DynamoDB, SNS, SQS, EventBridge
├── tsconfig.json
├── jest.config.ts
├── .eslintrc.js
├── .env.example
└── package.json```

---

## Requisitos previos

| Herramienta          | Versión mínima                   |
| -------------------- | -------------------------------- |
| Node.js              | 20.x                             |
| npm                  | 10.x                             |
| Serverless Framework | 3.x                              |
| AWS CLI              | 2.x configurado con credenciales |

```bash
# Instalar Serverless Framework globalmente
npm install -g serverless

# Verificar credenciales AWS configuradas
aws sts get-caller-identity
````

---

## Instalación

```bash
# Clonar el repositorio
git clone <URL_REPOSITORIO>
cd serverless-reto-rimac

# Instalar dependencias
pnpm install

# Copiar variables de entorno si quieres local, aunque no es necesario para desplegar
cp .env.example .env
# Editar .env con tus valores reales
```

---

## Variables de entorno

| Variable               | Descripción                        |
| ---------------------- | ---------------------------------- |
| `AWS_REGION`           | Región AWS (ej: `us-east-1`)       |
| `DYNAMODB_TABLE`       | Nombre de la tabla DynamoDB        |
| `SNS_TOPIC_ARN`        | ARN del tópico SNS                 |
| `SQS_PE_URL`           | URL de la cola SQS Perú            |
| `SQS_CL_URL`           | URL de la cola SQS Chile           |
| `SQS_CONFIRMATION_URL` | URL de la cola SQS de confirmación |
| `DB_PE_HOST`           | Host RDS MySQL Perú                |
| `DB_PE_USER`           | Usuario RDS Perú                   |
| `DB_PE_PASSWORD`       | Contraseña RDS Perú                |
| `DB_PE_NAME`           | Nombre base de datos Perú          |
| `DB_CL_HOST`           | Host RDS MySQL Chile               |
| `DB_CL_USER`           | Usuario RDS Chile                  |
| `DB_CL_PASSWORD`       | Contraseña RDS Chile               |
| `DB_CL_NAME`           | Nombre base de datos Chile         |

> Las variables de AWS (ARNs, URLs) se inyectan automáticamente desde `serverless.yml` al desplegar.

---

## Documentación API (Swagger)

La especificación OpenAPI 3.0 completa se encuentra en [`swagger.yml`](swagger.yml) en la raíz del proyecto.

Para visualizarla interactivamente:

```bash
# Opción 1: VS Code — extensión "OpenAPI (Swagger) Editor"
# Abrir swagger.yml y presionar Ctrl+Shift+P → "OpenAPI: Preview"

# Opción 2: Swagger UI online
# Ir a https://editor.swagger.io y pegar el contenido de swagger.yml

# Opción 3: npx (sin instalación)
npx @redocly/cli preview-docs swagger.yml
```

---

## Flujo técnico

1. **POST /appointments** → Lambda `appointment` guarda en DynamoDB con `status: pending` y publica en SNS con atributo `countryISO`.
2. **SNS** filtra por `countryISO` y enruta al SQS correspondiente (`sqs_pe` o `sqs_cl`).
3. **Lambda `appointment_pe` / `appointment_cl`** consume el SQS y guarda el agendamiento en la base de datos MySQL del país.
4. Las lambdas por país publican un evento `AppointmentConfirmed` a **EventBridge**.
5. **EventBridge** enruta el evento a la cola SQS de confirmación.
6. **Lambda `appointment`** consume la cola de confirmación y actualiza el estado en DynamoDB a `completed`.

---

## Base de datos

### DynamoDB — Tabla `rimac-appointment-appointments-{stage}`

| Campo            | Tipo         | Descripción                      |
| ---------------- | ------------ | -------------------------------- |
| `appointment_id` | String (PK)  | UUID generado automáticamente    |
| `insured_id`     | String (GSI) | Código del asegurado (5 dígitos) |
| `schedule_id`    | Number       | ID del espacio de cita           |
| `country_iso`    | String       | `PE` o `CL`                      |
| `status`         | String       | `pending` \| `completed`         |
| `created_at`     | String       | ISO 8601                         |
| `updated_at`     | String       | ISO 8601                         |

> GSI: `insuredId-index` — permite consultar todos los agendamientos de un asegurado.

### MySQL RDS — Tabla `appointments` (PE y CL)

```sql
CREATE TABLE appointments (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id VARCHAR(36)  NOT NULL UNIQUE,
  insured_id   VARCHAR(5)   NOT NULL,
  schedule_id  INT          NOT NULL,
  country_iso  VARCHAR(2)   NOT NULL,
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Pruebas

```bash
# Ejecutar pruebas unitarias
pnpm test
```
