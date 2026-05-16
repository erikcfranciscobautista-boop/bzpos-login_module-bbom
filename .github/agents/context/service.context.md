# Service Context

## Rol de la Capa Service
- Contener toda la logica de negocio.
- Orquestar llamadas a repository.
- Mapear reglas de negocio a AppError + errorCatalog cuando aplique.
- No acceder directo a Prisma.
- Usar como fuente canonica de desacoplamiento: .github/agents/context/layer-injection.context.md

## Reglas Obligatorias
- El controller solo delega al service.
- El service no conoce detalles HTTP (statusCode, reply, request).
- Toda validacion estructural de entrada se resuelve en router con Zod preHandler.
- Manejar casos de negocio esperados (not found, duplicados, estado invalido) con errores del catalogo.
- El service retorna Output DTO de la funcionalidad (o null/error segun caso).
- No retornar estructuras ad-hoc diferentes al DTO definido.

## Especificacion de Desacoplamiento por Capas
- Service depende de puertos/contratos (interface o type), no de clases concretas de repository.
- El puerto se define cercano al Service (misma funcionalidad) o en contracts compartidos.
- Service nunca instancia repositories/controllers/routers.
- Service puede orquestar multiples puertos si la regla de negocio lo requiere.
- El punto de composicion recomendado es Routes o archivo dependencies por funcionalidad.
- El Service no importa Prisma ni tipos internos de Prisma.

## Estructura Recomendada
- Ruta de archivo: src/services/{{FUNCTIONALITY}}/*.service.ts o src/services/{{FUNCTIONALITY}}.service.ts
- Firma tipada de entrada/salida con DTOs de src/models/dto.
- Puerto recomendado:
  - src/services/{{FUNCTIONALITY}}/{{FUNCTIONALITY}}.ports.ts
  - o src/contracts/{{FUNCTIONALITY}}/{{FUNCTIONALITY}}.ports.ts

## Ejemplo de Patron Desacoplado

Patron base:
```ts
import type { OutputDto } from "../../models/dto/output/{{FUNCTIONALITY}}/output.dto.js";

export type FindEntityByIdPort = (id: string) => Promise<OutputDto | null>;

export class {{Functionality}}Service {
  constructor(private readonly findEntityById: FindEntityByIdPort) {}

  async getEntity(id: string): Promise<OutputDto | null> {
    const row = await this.findEntityById(id);

    if (!row) {
      return null;
    }

    return row;
  }
}
```

Patron para reglas de negocio con varios puertos:
```ts
export interface {{Functionality}}RepositoryPort {
  findById(id: string): Promise<OutputDto | null>;
  updateStatus(id: string, status: string): Promise<boolean>;
}

export class {{Functionality}}Service {
  constructor(private readonly repository: {{Functionality}}RepositoryPort) {}

  async execute(id: string): Promise<OutputDto> {
    const row = await this.repository.findById(id);
    if (!row) {
      throw new AppError(errorCatalog.RESOURCE_NOT_FOUND);
    }
    return row;
  }
}
```

## Checklist Rapido Service
- [ ] Sin acceso directo a Prisma.
- [ ] Logica de negocio en esta capa.
- [ ] Tipado de retorno con Output DTO de la funcionalidad.
- [ ] Errores de negocio mapeados al catalogo cuando aplique.
- [ ] Dependencias definidas por puertos/contratos (no clases concretas).
