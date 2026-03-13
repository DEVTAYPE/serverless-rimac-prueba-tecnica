# Despliegue en AWS

Guía completa para desplegar el proyecto en AWS real usando Serverless Framework.

---

## Recursos que se crean automáticamente

Al ejecutar `serverless deploy`, CloudFormation crea todos estos recursos:

| Recurso     | Nombre                                        | Tipo                            |
| ----------- | --------------------------------------------- | ------------------------------- |
| API Gateway | `rimac-appointment-dev`                       | REST API                        |
| Lambda      | `appointmentCreate`                           | POST /appointments              |
| Lambda      | `appointmentList`                             | GET /appointments/{insuredId}   |
| Lambda      | `appointmentPe`                               | SQS consumer Perú               |
| Lambda      | `appointmentCl`                               | SQS consumer Chile              |
| Lambda      | `appointmentConfirmation`                     | SQS consumer confirmación       |
| DynamoDB    | `rimac-appointment-appointments-dev`          | Table + GSI                     |
| SNS         | `rimac-appointment-topic-dev`                 | Topic con FilterPolicy          |
| SQS         | `rimac-appointment-sqs-pe-dev`                | Cola Perú + DLQ                 |
| SQS         | `rimac-appointment-sqs-cl-dev`                | Cola Chile + DLQ                |
| SQS         | `rimac-appointment-sqs-confirmation-dev`      | Cola confirmación               |
| EventBridge | `rimac-appointment-appointment-confirmed-dev` | Rule                            |
| IAM Role    | auto generado                                 | Permisos para todas las Lambdas |

> Las bases de datos RDS **no** las crea Serverless Framework — se crean manualmente.

---

## Requisitos previos

| Herramienta  | Versión mínima | Verificar con     |
| ------------ | -------------- | ----------------- |
| Node.js      | 22.x           | `node -v`         |
| npm          | 10+            | `npm -v`          |
| AWS CLI      | 2.x            | `aws --version`   |
| MySQL client | cualquiera     | `mysql --version` |

---

## Configurar credenciales AWS

```bash
aws configure
```

```
AWS Access Key ID:     <tu-access-key-id>
AWS Secret Access Key: <tu-secret-access-key>
Default region:        us-east-1
Default output format: json
```

Verifica que funcionan:

```bash
aws sts get-caller-identity
```

---

## Crear instancias RDS MySQL

Crea dos instancias MySQL (una para Perú, otra para Chile). El `--db-instance-class db.t3.micro` entra en **Free Tier**.

```bash
# Base de datos Perú
aws rds create-db-instance  --db-instance-identifier rimac-db-pe  --db-instance-class db.t3.micro  --engine mysql  --master-username admin  --master-user-password TuPasswordSegura123!  --db-name appointments_pe  --allocated-storage 20  --publicly-accessible  --no-multi-az

# Base de datos Chile
aws rds create-db-instance  --db-instance-identifier rimac-db-cl  --db-instance-class db.t3.micro  --engine mysql  --master-username admin  --master-user-password TuPasswordSegura123!  --db-name appointments_cl  --allocated-storage 20  --publicly-accessible  --no-multi-az
```

Espera ~5 minutos. Verifica que estén `available`:

```bash
aws rds describe-db-instances --query "DBInstances[*].{id:DBInstanceIdentifier,endpoint:Endpoint.Address,status:DBInstanceStatus}" --output table
```

Cuando esten crados te daran un resultado asi:

```
---------------------------------------------------------------------------------------
|                                 DescribeDBInstances                                 |
+-------------------------------------------------------+--------------+--------------+
|                       endpoint                        |     id       |   status     |
+-------------------------------------------------------+--------------+--------------+
|  rimac-db-cl.ck70eeoiqwyc.us-east-1.rds.amazonaws.com |  rimac-db-cl |  backing-up  |
|  rimac-db-pe.ck70eeoiqwyc.us-east-1.rds.amazonaws.com |  rimac-db-pe |  backing-up  |
+------------------------------------------------------
```

---

## Crear la tabla `appointments` en ambas RDS

Conéctate con el endpoint que retornó el comando anterior:

```bash
# Tabla PE
mysql -h <endpoint-pe>.rds.amazonaws.com -u admin -p appointments_pe -e "
DROP TABLE IF EXISTS appointments;
CREATE TABLE appointments (
  appointment_id VARCHAR(36) PRIMARY KEY,
  insured_id VARCHAR(5) NOT NULL,
  schedule_id INT NOT NULL,
  country_iso VARCHAR(2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);"


# Tabla CL
mysql -h <endpoint-cl>.rds.amazonaws.com -u admin -p appointments_cl -e "
DROP TABLE IF EXISTS appointments;
CREATE TABLE appointments (
  appointment_id VARCHAR(36) PRIMARY KEY,
  insured_id VARCHAR(5) NOT NULL,
  schedule_id INT NOT NULL,
  country_iso VARCHAR(2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);"
```

EJEMPLO CON NUESTRAS TABLAS:

```bash
mysql -h rimac-db-pe.ck70eeoiqwyc.us-east-1.rds.amazonaws.com -u admin -p appointments_pe -e " DROP TABLE IF EXISTS appointments; CREATE TABLE appointments ( appointment_id VARCHAR(36) PRIMARY KEY, insured_id VARCHAR(5) NOT NULL, schedule_id INT NOT NULL, country_iso VARCHAR(2) NOT NULL, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP );"
```

```bash
mysql -h rimac-db-cl.ck70eeoiqwyc.us-east-1.rds.amazonaws.com -u admin -p appointments_cl -e " DROP TABLE IF EXISTS appointments; CREATE TABLE appointments ( appointment_id VARCHAR(36) PRIMARY KEY, insured_id VARCHAR(5) NOT NULL, schedule_id INT NOT NULL, country_iso VARCHAR(2) NOT NULL, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP );"

```

> Si no tienes `mysql` instalado localmente, puedes usar el cliente desde una EC2 o Cloud Shell de AWS.

---

## Guardar credenciales en SSM Parameter Store

Las Lambdas leen la configuración de base de datos desde SSM en tiempo de ejecución.

```bash
# ── Perú ─────────────────────────────────────────────────────────────
aws ssm put-parameter --name "/rimac/dev/DB_PE_HOST" --value "<endpoint-pe>.rds.amazonaws.com" --type "String" --overwrite

aws ssm put-parameter --name "/rimac/dev/DB_PE_PORT" --value "3306" --type "String" --overwrite

aws ssm put-parameter --name "/rimac/dev/DB_PE_USER" --value "admin" --type "String" --overwrite

aws ssm put-parameter --name "/rimac/dev/DB_PE_PASSWORD" --value "TuPasswordSegura123!" --type "SecureString" --overwrite

aws ssm put-parameter --name "/rimac/dev/DB_PE_NAME" --value "appointments_pe" --type "String" --overwrite

# ── Chile ─────────────────────────────────────────────────────────────
aws ssm put-parameter --name "/rimac/dev/DB_CL_HOST" --value "<endpoint-cl>.rds.amazonaws.com" --type "String" --overwrite

aws ssm put-parameter --name "/rimac/dev/DB_CL_PORT" --value "3306" --type "String" --overwrite

aws ssm put-parameter --name "/rimac/dev/DB_CL_USER" --value "admin" --type "String" --overwrite

aws ssm put-parameter --name "/rimac/dev/DB_CL_PASSWORD" --value "TuPasswordSegura123!" --type "SecureString" --overwrite

aws ssm put-parameter --name "/rimac/dev/DB_CL_NAME" --value "appointments_cl" --type "String" --overwrite
```

EJEMPLO CON DEPLOY REAL:

# PERU

```bash
aws ssm put-parameter --name "/rimac/dev/DB_PE_HOST" --value "rimac-db-pe.ck70eeoiqwyc.us-east-1.rds.amazonaws.com" --type "String" --overwrite

aws ssm put-parameter --name "/rimac/dev/DB_PE_PORT" --value "3306" --type "String" --overwrite

aws ssm put-parameter --name "/rimac/dev/DB_PE_USER" --value "admin" --type "String" --overwrite

aws ssm put-parameter --name "/rimac/dev/DB_PE_PASSWORD" --value "TuPasswordSegura123!" --type "SecureString" --overwrite

aws ssm put-parameter --name "/rimac/dev/DB_PE_NAME" --value "appointments_pe" --type "String" --overwrite
```

# CHILE

```bash
aws ssm put-parameter --name "/rimac/dev/DB_CL_HOST" --value "rimac-db-cl.ck70eeoiqwyc.us-east-1.rds.amazonaws.com" --type "String" --overwrite

aws ssm put-parameter --name "/rimac/dev/DB_CL_PORT" --value "3306" --type "String" --overwrite

aws ssm put-parameter --name "/rimac/dev/DB_CL_USER" --value "admin" --type "String" --overwrite

aws ssm put-parameter --name "/rimac/dev/DB_CL_PASSWORD" --value "TuPasswordSegura123!" --type "SecureString" --overwrite

aws ssm put-parameter --name "/rimac/dev/DB_CL_NAME" --value "appointments_cl" --type "String" --overwrite
```

Verifica que se guardaron correctamente:

```bash
aws ssm get-parameters-by-path --path "/rimac/dev" --query "Parameters[*].{Name:Name,Type:Type}"  --output table
```

---

## Paso 5 — Instalar dependencias y desplegar

```bash
pnpm install
pnpm add -D serverless-esbuild
npx serverless deploy --stage dev
```

Salida esperada al terminar (~250 segundos):

```
Deploying "rimac-appointment" to stage "dev" (us-east-1)

✔ Service deployed to stack rimac-appointment-dev (150s)

endpoints:
  POST - https://ss4lktwio5.execute-api.us-east-1.amazonaws.com/dev/appointments
  GET - https://ss4lktwio5.execute-api.us-east-1.amazonaws.com/dev/appointments/{insuredId}
functions:
  appointmentCreate: rimac-appointment-dev-appointmentCreate (2 MB)
  appointmentList: rimac-appointment-dev-appointmentList (2 MB)
  appointmentPe: rimac-appointment-dev-appointmentPe (2 MB)
  appointmentCl: rimac-appointment-dev-appointmentCl (2 MB)
  appointmentConfirmation: rimac-appointment-dev-appointmentConfirmation (2 MB)


```

> Guarda la URL base del API Gateway — la necesitarás para probar.

---

## Paso 6 — Probar los endpoints

Reemplaza `<API_URL>` con la URL que imprimió el deploy.

### Crear cita — Perú

```bash
curl -X POST <API_URL>/dev/appointments \
  -H "Content-Type: application/json" \
  -d '{"insuredId":"00123","scheduleId":1,"countryISO":"PE"}'
```

Respuesta esperada (`202 Accepted`):

```json
{
  "message": "Cita en proceso de agendamiento",
  "appointmentId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

### Crear cita — Chile

```bash
curl -X POST <API_URL>/dev/appointments \
  -H "Content-Type: application/json" \
  -d '{"insuredId":"00456","scheduleId":2,"countryISO":"CL"}'
```

### Consultar citas de un asegurado

```bash
curl <API_URL>/dev/appointments/00123
```

Respuesta esperada (`200 OK`):

```json
[
  {
    "appointmentId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "insuredId": "00123",
    "scheduleId": 1,
    "countryISO": "PE",
    "status": "pending",
    "createdAt": "2026-03-12T00:00:00.000Z"
  }
]
```

---

## Comandos útiles post-despliegue

```bash
# Ver logs de una Lambda en tiempo real
npx serverless logs -f appointmentCreate --stage dev --tail

# Ver logs de la Lambda PE
npx serverless logs -f appointmentPe --stage dev --tail

# Ver información del stack desplegado
npx serverless info --stage dev

# Re-desplegar solo una función (más rápido)
npx serverless deploy function -f appointmentCreate --stage dev
```

---

## Eliminar el stack completo

Cuando ya no necesites el proyecto, elimina todos los recursos con un solo comando:

```bash
npx serverless remove --stage dev
```

Esto elimina el stack CloudFormation completo:

- ✅ Todas las Lambdas
- ✅ API Gateway
- ✅ DynamoDB table
- ✅ SNS topic + subscripciones
- ✅ SQS queues + DLQs
- ✅ EventBridge rule
- ✅ IAM role

### Recursos que debes eliminar manualmente

`serverless remove` **NO elimina** los siguientes recursos porque no los creó:

**RDS (bases de datos):**

```bash
aws rds delete-db-instance \
  --db-instance-identifier rimac-db-pe \
  --skip-final-snapshot

aws rds delete-db-instance \
  --db-instance-identifier rimac-db-cl \
  --skip-final-snapshot
```

**SSM Parameters:**

```bash
aws ssm delete-parameters --names \
  "/rimac/dev/DB_PE_HOST" \
  "/rimac/dev/DB_PE_PORT" \
  "/rimac/dev/DB_PE_USER" \
  "/rimac/dev/DB_PE_PASSWORD" \
  "/rimac/dev/DB_PE_NAME" \
  "/rimac/dev/DB_CL_HOST" \
  "/rimac/dev/DB_CL_PORT" \
  "/rimac/dev/DB_CL_USER" \
  "/rimac/dev/DB_CL_PASSWORD" \
  "/rimac/dev/DB_CL_NAME"
```

**Bucket S3 de despliegue** (creado automáticamente por Serverless):

```bash
# Primero vacía el bucket
aws s3 rm s3://rimac-appointment-dev-serverlessdeploymentbucket --recursive

# Luego elimínalo
aws s3 rb s3://rimac-appointment-dev-serverlessdeploymentbucket
```

> El nombre exacto del bucket lo puedes ver en S3 Console buscando `rimac-appointment-dev`.

### Verificar que todo fue eliminado

```bash
# Confirmar que el stack CloudFormation ya no existe
aws cloudformation describe-stacks \
  --stack-name rimac-appointment-dev 2>&1

# Confirmar que las RDS están en proceso de eliminación
aws rds describe-db-instances \
  --query "DBInstances[*].{id:DBInstanceIdentifier,status:DBInstanceStatus}" \
  --output table
```

---

## Diferencias clave vs ejecución local

| Aspecto          | Local (LocalStack)          | AWS real                  |
| ---------------- | --------------------------- | ------------------------- |
| Credenciales     | `test / test`               | IAM real                  |
| MySQL            | Docker (puertos 3307/3308)  | RDS                       |
| AWS Services     | LocalStack `localhost:4566` | AWS endpoints automáticos |
| Configuración DB | variables en `.env`         | SSM Parameter Store       |
| URL HTTP         | `http://localhost:3001`     | API Gateway URL           |
| Deploy           | no aplica                   | `npx serverless deploy`   |
| Runners          | `tsx scripts/dev-server.ts` | Lambdas en AWS            |

---

### ❌ `appointmentPe` / `appointmentCl` timeout a los 6 segundos — status queda en `pending`

**Síntoma:** Los logs de `appointmentPe` muestran:

```
END Duration: 6000.00 ms (init: timeout)
```

Y al consultar el GET la cita permanece con `"status": "pending"` en lugar de `"completed"`.

**Causa:** El Security Group asignado automáticamente a las instancias RDS no tenía reglas de entrada. Lambda no tiene IP fija (ejecuta desde rangos dinámicos de AWS), por lo que no puede conectarse al puerto 3306 de RDS — la conexión simplemente expira.

**Solución:** Abrir el puerto 3306 en el Security Group de RDS y aumentar el timeout de Lambda a 30 segundos.

```bash
# Obtén el Security Group ID de tus instancias RDS (visible en aws rds describe-db-instances)
aws ec2 authorize-security-group-ingress \
  --group-id <sg-id-de-tu-rds> \
  --protocol tcp \
  --port 3306 \
  --cidr 0.0.0.0/0
```

En `serverless.yml`, el timeout global ya está configurado en 30 segundos:

```yaml
provider:
  timeout: 30
```

Re-desplegar después del cambio:

```bash
npx serverless deploy --stage dev
```

> **Nota de seguridad:** `0.0.0.0/0` es adecuado para un entorno de desarrollo/reto técnico. En producción, restringir el acceso solo a los rangos de IP de Lambda de la misma región o usar VPC.
