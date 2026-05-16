# Layer Injection Context

## Objetivo
Definir una sola forma de desacoplar capas en UUAA, estable y retrocompatible para este repositorio y futuros repositorios.

## Contrato Canonico (Version 2 - Ports First)
- Flujo obligatorio: Routes -> Controller -> Service(ports) -> Repository(adapter) -> Prisma.
- Punto de composicion obligatorio: archivo dependencies por funcionalidad.
- Service depende de puertos/contratos, no de clases concretas.
- Repository implementa los puertos requeridos por Service.
- Repository retorna Output DTO de la funcionalidad (o null cuando aplique).
- Service retorna Output DTO de la funcionalidad (o null/error controlado).
- Controller responde con Output DTO en casos exitosos.
- DTO de entrada se valida en Routes con createZodValidationPreHandler.

## Convenciones de Naming
- Campos de entrada (params/query/body): {{uuaa}}_field.
- Campos de salida: reflejan contrato DTO de la funcionalidad.
- Solo tablas usan prefijo t_{{uuaa}}_name.

## Estructura Recomendada por Funcionalidad
- Ports:
  - src/services/{{FUNCTIONALITY}}/{{FUNCTIONALITY}}.ports.ts
  - o src/contracts/{{FUNCTIONALITY}}/{{FUNCTIONALITY}}.ports.ts
- Repository adapter:
  - src/repositories/{{FUNCTIONALITY}}/{{FUNCTIONALITY}}.repository.ts
- Composition root (obligatorio):
  - src/api/routes/{{FUNCTIONALITY}}/{{FUNCTIONALITY}}.dependencies.ts

## Ejemplo Canonico de Ports + Service
```ts
import type { GetStatusByIdOutputDto } from "../models/dto/output/status/getStatusByIdOutput.dto.js";

export interface StatusRepositoryPort {
  findBcpmStatusById(id: string): Promise<GetStatusByIdOutputDto | null>;
}

export class StatusService {
  constructor(private readonly repository: StatusRepositoryPort) {}

  async getBcpmStatusById(id: string): Promise<GetStatusByIdOutputDto | null> {
    return this.repository.findBcpmStatusById(id);
  }
}
```

## Ejemplo Canonico de Repository Adapter
```ts
import { prisma } from "../lib/prisma/prisma.js";
import {
  getStatusByIdOutputDto,
  type GetStatusByIdOutputDto,
} from "../models/dto/output/status/getStatusByIdOutput.dto.js";
import type { StatusRepositoryPort } from "../services/status/status.ports.js";

export class PrismaStatusRepository implements StatusRepositoryPort {
  async findBcpmStatusById(id: string): Promise<GetStatusByIdOutputDto | null> {
    const status = await prisma.t_bcpm_status.findUnique({
      where: { bcpm_status_id: id },
      select: {
        bcpm_status_key: true,
        bcpm_status_name: true,
        bcpm_status_type: true,
      },
    });

    if (!status) {
      return null;
    }

    return getStatusByIdOutputDto.parse(status);
  }
}
```

## Ejemplo Canonico de Composition Root
```ts
import type { FastifyPluginAsync } from "fastify";

import { createZodValidationPreHandler } from "../middlewares/zodValidationPreHandler.js";
import { buildStatusController } from "../controllers/status.controller.js";
import { getStatusByIdSchema } from "../swagger/status.swagger.js";
import { getStatusByIdParamsDto } from "../../models/dto/input/status/getStatusByIdParams.dto.js";
import { PrismaStatusRepository } from "../../repositories/status/status.repository.js";
import { StatusService } from "../../services/status/status.service.js";

export const statusRoutes: FastifyPluginAsync = async (app) => {
  const repository = new PrismaStatusRepository();
  const service = new StatusService(repository);
  const controller = buildStatusController({
    getStatusById: service.getBcpmStatusById.bind(service),
  });

  app.get(
    "/status/:id",
    {
      schema: getStatusByIdSchema,
      preHandler: createZodValidationPreHandler({ params: getStatusByIdParamsDto }),
    },
    controller,
  );
};
```

## Anti-Patrones (No Permitidos)
- Importar Repository directamente en Controller.
- Service importando clase concreta de Repository cuando existe puerto.
- Retornar entidad Prisma cruda fuera de Repository.
- Armar objetos de respuesta ad-hoc distintos al Output DTO.
- Validar entrada en Controller en lugar de Routes.
- Crear dependencias dentro del handler por request.

## Reglas de Retrocompatibilidad
- Nuevos endpoints deben usar Version 2 (Ports First).
- Endpoints legacy Version 1 pueden coexistir temporalmente.
- Migrar por endpoint sin romper contratos HTTP existentes.
- Si se requiere cambio de contrato de respuesta, versionar DTO y schema Swagger.
- Cualquier excepcion debe documentarse en el contexto de la funcionalidad.

## Checklist de Migracion por Endpoint
- [ ] Input DTO creado en src/models/dto/input/{{FUNCTIONALITY}}.
- [ ] Output DTO creado en src/models/dto/output/{{FUNCTIONALITY}}.
- [ ] Puerto/contrato definido para el Service.
- [ ] Repository implementa el puerto y retorna Output DTO (o null).
- [ ] Service depende del puerto y retorna Output DTO (o null/error controlado).
- [ ] Controller responde Output DTO en 2xx.
- [ ] Routes/dependencies compone dependencias.
- [ ] Routes valida entrada con createZodValidationPreHandler.
- [ ] Swagger refleja input/output DTO vigente.