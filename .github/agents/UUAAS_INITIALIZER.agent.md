---
name: UUAA INITIALIZER
model: GPT-5.3-Codex
description: "Agente para inicializar un nuevo proyecto UUAAS con un baseline tecnico desacoplado por capas y puertos (ports-first)."
---
# Inicializar Proyecto por uuaas

Usa este prompt para pedirle al agente que te inicialice un nuevo proyecto con un baseline tecnico.

## Prompt

```text
Actua como arquitecto backend senior para BAUHEZ POS.
Necesito inicializar un nuevo proyecto UUAAS tomando como baseline esta repo.

Objetivo:
Crear la base del proyecto con el mismo stack y configuraciones iniciales:
- Node.js + Fastify + TypeScript (ESM, strict true)
- Prisma + PostgreSQL
- Zod para validacion
- @fastify/jwt para autenticacion
- Argon2 para hashing
- Swagger para documentacion

Requisitos de bootstrap:
1) Inicializar scaffold del proyecto Node.js + Fastify:
- Inicializar proyecto Node.js con package.json
- Configurar package.json con "type": "module"
- Instalar Fastify y plugin base de CORS
- Instalar TypeScript toolchain (typescript, tsx, nodemon, @types/node)
- Crear estructura inicial minima: src/, prisma/, docs/, tests/
- Generar archivos base: src/server.ts, src/app.ts, tsconfig.json, .env.example
- Levantar endpoint root inicial (GET /) con Fastify

2) Replicar scripts base:
- predev: kill-port {{PORT}} || true
- dev: npm run predev && nodemon --exec tsx src/server.ts
- build: tsc
- start: node dist/server.js

3) Replicar baseline de dependencias (misma familia/version mayor):
- fastify, @fastify/auth, @fastify/cors, @fastify/jwt, @fastify/swagger
- zod, argon2, dotenv, pino, nodemailer
- prisma, @prisma/client, @prisma/adapter-pg, pg
- typescript, tsx, nodemon, kill-port, @types/node, @types/pg, @types/argon2, dotenv-cli

4) Generar estructura base:
- prisma/schema.prisma
- prisma.config.ts
- src/server.ts
- src/app.ts
- src/config/env.ts
- src/lib/prisma/prisma.ts
- src/api/{routes,controllers,middlewares,swagger}
- src/{services,repositories,models,contracts}

4.1) Baseline de desacoplamiento por capas (obligatorio):
- Definir puertos por funcionalidad para desacoplar Service de Repository concreto.
- Service debe depender de puertos (interfaces/types), no de clases concretas.
- Repository debe actuar como adapter de infraestructura e implementar puertos.
- Composition root en routes o archivo dependencies por funcionalidad.
- Mantener flujo: Routes -> Controller -> Service(ports) -> Repository(adapter) -> Prisma.

5) Configuracion TypeScript:
- module/moduleResolution para ESM
- strict true
- rootDir src
- outDir dist

6) Prisma con DB compartida y schemas separados por UUAAS:
- La base de datos es la misma para varios UUAAS.
- Si {{UUAAS_SCHEMA}} tiene valor, configura DATABASE_URL con ?schema={{UUAAS_SCHEMA}}
- Si {{UUAAS_SCHEMA}} viene vacio, "sin schema" o "none", NO agregar query param schema
- Ejemplo con schema: postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema={{UUAAS_SCHEMA}}
- Ejemplo sin schema: postgresql://USER:PASSWORD@HOST:5432/DB_NAME
- Si detectas necesidad real de multi-schema en un mismo servicio, propon variante con:
  - datasource db { schemas = ["schema_a", "schema_b"] }
  - @@schema("schema_x") por modelo

7) Hallazgos obligatorios de bootstrap (anti-fallas):
- Prisma 7: en prisma/schema.prisma NO usar `url = env("DATABASE_URL")` dentro de datasource.
- Prisma 7: definir conexion en prisma.config.ts (datasource.url) y correr `prisma generate` al final.
- Generar `.env.example` y tambien `.env` local minimo para validaciones de arranque.
- Variables minimas obligatorias: NODE_ENV, HOST, PORT, API_PREFIX, JWT_SECRET, DATABASE_URL, LOG_LEVEL.
- Normalizar API_PREFIX: guardar en env sin slash (ej: v1) y registrar rutas con `prefix: /${env.API_PREFIX}`.
- En Zod, cada clave del envSchema debe ser schema Zod (no valores crudos como `HOST: process.env.HOST`).
- Usar `HOST` desde env y bindear server.listen con `{ host: env.HOST, port: env.PORT }`.
- Instalar dependencias en pasos cortos (runtime y dev por separado) para reducir cancelaciones.
- Verificacion final obligatoria:
  - npm run prisma:generate
  - npm run build
  - npm run dev
  - probar GET / y endpoints bajo /{{API_PREFIX}}

8) Entregables esperados:
- Lista de archivos creados
- Contenido inicial de cada archivo clave
- Variables de entorno requeridas
- Pasos para correr: npm run dev, npm run build, npm start
- Checklist tecnico de verificacion

----------------------------------------------------------------------

9) Ejemplos bases de codigo 

1. src/server.ts
```
import { buildApp } from "./app.js";
import { env } from "./config/env.js";

const app = await buildApp();

try {
  await app.listen({
    host: env.HOST,
    port: env.PORT
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

const closeServer = async () => {
  await app.close();
  process.exit(0);
};

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);
```

2. src/api/routes/index.ts
```
import type { FastifyInstance } from "fastify";

import { statusRoutes } from "./status.js";

export async function apiRoutes(app: FastifyInstance) {
  await app.register(statusRoutes);
}
```


2. src/app.ts
```
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify, { type FastifyInstance } from "fastify";

import { apiRoutes } from "./api/routes/index.js";
import { registerSwagger } from "./api/swagger/swagger.js";
import { env } from "./config/env.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({logger: {level: env.LOG_LEVEL}});

  app.get("/", async () => {
    return {
      service: "BCPM",
      status: "up"
    };
  });

  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: env.JWT_SECRET });
  await registerSwagger(app);
  await app.register(apiRoutes, { prefix: `/${env.API_PREFIX}` });

  return app;
}
```


----------------------------------------------------------------------

Datos de este nuevo servicio:
- Nombre proyecto: {{PROJECT_NAME}}
- Puerto: {{PORT}}
- Prefijo API: {{API_PREFIX}}
- Schema PostgreSQL: {{UUAAS_SCHEMA}}
- Modo Prisma: {{single-schema|multi-schema}}

Importante:
- No cambiar el stack principal.
- No simplificar a Express.
- No omitir strict typing.
- Mantener coherencia con la arquitectura de bauhez-pos-api.
- Mantener desacoplamiento ports-first como baseline de arquitectura.
- Entregar siempre evidencia de comandos ejecutados y resultado de endpoints.
```

## Variables a reemplazar

- `{{PROJECT_NAME}}`: nombre del nuevo repo/servicio.
- `{{PORT}}`: puerto del servicio (ejemplo 3061).
- `{{API_PREFIX}}`: prefijo de rutas (ejemplo /v1/auth).
- `{{UUAAS_SCHEMA}}`: schema PostgreSQL dedicado al UUAAS.
- `{{single-schema|multi-schema}}`: estrategia de acceso Prisma.
