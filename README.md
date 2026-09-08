# Plataforma de Seguimiento de Proyectos (PMO / Implementacion / CSM / I+D+I)

Tablero para centralizar el seguimiento de proyectos, separando los procesos de
**PMO**, **Implementacion Interna**, **CSM** e **I+D+I**, con calculo automatico de avance,
comparacion de costos, indicadores NPS/CSAT, panel ejecutivo con metas mensuales,
alertas, tareas y control de actualizacion semanal.

Construido como **SPA React** + **backend serverless en AWS**, optimizado para bajo costo.

## Arquitectura

| Capa | Tecnologia |
|------|------------|
| Frontend | React + Vite + TypeScript + Tailwind, servido desde **S3 + CloudFront** |
| Autenticacion | **Portal ImpactIA** (Entra ID). Se abre desde el catálogo; no hay login propio. |
| API | **API Gateway HTTP API** + **AWS Lambda** (Node.js 20, TypeScript) |
| Base de datos | **DynamoDB** single-table, on-demand |
| Secretos | **SSM Parameter Store** (config Supabase) |
| Encuestas | Lectura del **Supabase externo** (solo lectura) o registro manual |
| IaC | **AWS CDK** (TypeScript) |

```
GesProyectos/
  infra/       # AWS CDK (DynamoDB, Cognito, Lambda, HTTP API, S3, CloudFront)
  backend/     # Lambda (handlers + dominio: avance, costos, permisos)
  frontend/    # SPA React
```

## Requisitos

- Node.js 20+
- AWS CLI configurado con un perfil (por defecto se usa `infotrack`, region `us-east-1`)

## Instalacion

```bash
npm install            # instala los 3 workspaces
```

## Despliegue en AWS

```bash
export AWS_PROFILE=infotrack
export AWS_REGION=us-east-1

# 1. Bootstrap de CDK (solo la primera vez por cuenta/region)
cd infra && npx cdk bootstrap

# 2. Desplegar la infraestructura (crea Cognito, DynamoDB, API, S3, CloudFront)
npm run deploy         # genera infra/cdk-outputs.json

# 3. Construir y publicar el frontend
npm run build --workspace frontend
npm run deploy:frontend --workspace infra
```

Al finalizar, la URL de CloudFront se imprime en consola (output `CloudFrontUrl`).

### Acceso

GesProyectos se abre desde el **Portal de Aplicaciones** (ImpactIA), igual que el resto
de apps. El usuario inicia sesion en el portal con Microsoft y al pulsar el mosaico
la sesion se comparte. No hay usuario/contrasena de Cognito ni Redirect URI extra.

- **Administrador**: grupo Proceso Infraestructura
- **Implementador**: grupo Proceso I D I

Si se entra directo a CloudFront, la app pide abrirla desde el portal.

### Datos de ejemplo

Un Administrador puede pulsar **"Datos de ejemplo"** en el Panel Admin para
cargar proyectos, encuestas y panel ejecutivo de prueba.

## Integracion con Supabase (Epica 6)

La conexion en vivo con la plataforma de encuestas queda parametrizada. Cuando el
equipo entregue la URL y la anon key de su proyecto Supabase:

```bash
aws ssm put-parameter --overwrite --name /gesproyectos/supabase/url \
  --type String --value "https://<proyecto>.supabase.co"
aws ssm put-parameter --overwrite --name /gesproyectos/supabase/anon_key \
  --type SecureString --value "<anon_key>"
aws ssm put-parameter --overwrite --name /gesproyectos/supabase/table \
  --type String --value "surveys"
```

Luego, el boton **"Sincronizar Supabase"** en la pestana de Encuestas importa los
datos (solo lectura; no se escribe nada en Supabase). Mientras no este configurado,
las encuestas se registran manualmente.

## Roles

- **Administrador**: acceso completo a todos los procesos (PMO, Implementacion, CSM, I+D+I).
- **Implementador**: solo visualiza y edita proyectos de Implementacion Interna.

## Desarrollo local

```bash
# Backend/infra se validan con typecheck
npm run typecheck --workspace backend

# Frontend en modo dev (requiere apuntar a un API desplegado y abrirla desde el portal)
#   crea frontend/.env con VITE_API_URL
npm run dev --workspace frontend
```

## Mapeo de Epicas

| Epica | Modulo |
|-------|--------|
| 1 Separacion por proceso | Filtro global + etiquetas de proceso |
| 2 Vista General | `/` (conteos, avance, presupuesto, encuestas, alertas) |
| 3 Seguimiento semanal | `/semanal` (tarjetas expandibles + historial) |
| 4 Avance automatico | `backend/domain/progress.ts` |
| 5 Costos plan vs real | `backend/domain/costs.ts` + tarjetas |
| 6 NPS / CSAT | `/encuestas` (manual + Supabase) |
| 7 Perfiles | `/admin` (CRUD + permisos por rol) |
| 8-11 Panel Ejecutivo | `/ejecutivo` (metas, alertas, modulos, tareas, control) |

## Fuera de alcance (por ahora)

- Notificaciones automaticas por proyectos en riesgo/critico.
- Auto-conteo del resumen operativo por modulo (valores editables).
