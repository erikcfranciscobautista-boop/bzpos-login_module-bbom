# Repository Context

## Rol de la Capa Repository
- Ser la unica capa con acceso a DB via Prisma.
- Encapsular consultas y mapeos de persistencia.
- Retornar DTO de salida de la funcionalidad (src/models/dto/output/{{FUNCTIONALITY}}).
- Implementar los puertos/contratos definidos por la capa Service.
- Usar como fuente canonica de desacoplamiento: .github/agents/context/layer-injection.context.md

## Reglas Obligatorias
- No usar Prisma en service/controller/router.
- Consultas centralizadas en repository.
- Respetar modelos introspectados en prisma/schema.prisma.
- Mantener consultas legibles, tipadas y con select explicito cuando aplique.
- Convencion de nombres: las tablas usan prefijo t_{{uuaa}}_name.
- Los campos mantienen nomenclatura {{uuaa}}_field sin prefijo t_.
- La salida del repository debe ajustarse al DTO de salida de la funcionalidad.
- No retornar entidades crudas de Prisma al Service.

## Especificacion de Desacoplamiento por Capas
- Repository implementa uno o mas puertos consumidos por Service.
- El puerto se define en la capa Service o en contracts compartidos de la funcionalidad.
- Repository no conoce ni importa controller/router.
- Repository no debe contener logica de negocio compleja; solo acceso y mapeo de datos.
- El unico acoplamiento de infraestructura permitido aqui es Prisma (singleton existente).
- El Service consume el repository via puerto (find/create/update/delete), no via clase concreta.

## Estructura Recomendada
- Ruta de archivo: src/repositories/{{FUNCTIONALITY}}/*.repository.ts o src/repositories/{{FUNCTIONALITY}}.repository.ts
- Utilizar singleton de Prisma existente: src/lib/prisma/prisma.ts
- Si aplica, exponer class Prisma{{Functionality}}Repository para dejar claro su rol de adapter.

## Ejemplo de Adapter de Prisma

Patron base:
```ts
import { prisma } from "../../lib/prisma/prisma.js";
import type {
  {{Functionality}}RepositoryPort,
} from "../../services/{{FUNCTIONALITY}}/{{FUNCTIONALITY}}.ports.js";
import type { EntityModel } from "../../models/{{FUNCTIONALITY}}.model.js";

export class Prisma{{Functionality}}Repository implements {{Functionality}}RepositoryPort {
  async findEntityById(id: string): Promise<EntityModel | null> {
    const row = await prisma.entity.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
      },
    });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
    };
  }
}
```

## Checklist Rapido Repository
- [ ] Prisma solo en repository.
- [ ] Consultas con select/where claros.
- [ ] Sin reglas de negocio complejas.
- [ ] Retorno tipado con Output DTO de la funcionalidad.
- [ ] Implementa puerto/contrato usado por Service.
