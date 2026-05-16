# Routes Context

## Rol de la Capa Routes
- Definir endpoints por funcionalidad.
- Configurar schema/prefix y preHandler de validacion con Zod.
- Delegar en controller sin logica de negocio.
- Integrar documentacion Swagger por endpoint.
- Usar como fuente canonica de desacoplamiento: .github/agents/context/layer-injection.context.md

## Reglas Obligatorias
- Validacion de request en router con createZodValidationPreHandler.
- No ejecutar logica de negocio en router.
- Registrar rutas por funcionalidad bajo /${env.API_PREFIX}/{{FUNCTIONALITY}}.
- Para documentar un endpoint, leer y reutilizar el patron del archivo en src/api/swagger/{{FUNCTIONALITY}}.swagger.ts.
- Cada endpoint debe incluir la propiedad schema en la definicion de ruta y referenciar su objeto Swagger.
- En params/query/body de entrada usar nombres reales de campos de DB.
- Convencion de campos de entrada: {{uuaa}}_field.
- No usar prefijo t_ en campos de entrada; t_ se reserva para tablas.
- El handler del controller debe responder usando el Output DTO de la funcionalidad para respuestas exitosas.

## Especificacion de Desacoplamiento por Capas
- Composicion de dependencias en un archivo dependencies por funcionalidad.
- Ubicacion obligatoria del composition root:
  - src/api/routes/{{FUNCTIONALITY}}/{{FUNCTIONALITY}}.dependencies.ts
- Flujo obligatorio: Routes -> Controller -> Service(ports) -> Repository(adapter) -> Prisma.
- No se permite invertir dependencias (por ejemplo, Service importando Controller).
- Las instancias se crean al registrar el plugin de rutas, no dentro del handler por request.
- El router importa el controller construido desde dependencies y registra endpoints; no aplica reglas de negocio.

## Swagger en Routes
- El router consume schemas de src/api/swagger/*.swagger.ts.
- El plugin Swagger global se registra en src/api/swagger/swagger.ts.
- Si agregas endpoint nuevo, debes agregar o actualizar su schema Swagger correspondiente.

Flujo recomendado para documentar un endpoint:
1. Crear/editar archivo de documentacion en src/api/swagger/{{FUNCTIONALITY}}.swagger.ts.
2. Definir tags, summary, params/query/body y response por status code.
3. Exportar el schema como constante (as const).
4. Importar ese schema en el router de la funcionalidad.
5. Asignarlo en la opcion schema del endpoint.
6. En Swagger de entrada, mantener exactamente los nombres reales de campos de DB ({{uuaa}}_field).

## Estructura Recomendada
- Ruta de archivo: src/api/routes/{{FUNCTIONALITY}}/*.routes.ts o src/api/routes/{{FUNCTIONALITY}}.ts
- Registro en agregador principal de rutas (index o equivalente).
- Ruta de documentacion por endpoint: src/api/swagger/{{FUNCTIONALITY}}.swagger.ts
- Registro global de plugin: src/api/swagger/swagger.ts
- Archivo obligatorio de composition root:
  - src/api/routes/{{FUNCTIONALITY}}/{{FUNCTIONALITY}}.dependencies.ts

## Ejemplo Basado en Repositorio Actual
- Archivo real de referencia: src/api/routes/{{FUNCTIONALITY}}.route.ts
- Archivo real de documentacion: src/api/swagger/status.swagger.ts
- Registro plugin Swagger: src/api/swagger/swagger.ts

Patron base:
```ts
import type { FastifyPluginAsync } from "fastify";

import { createZodValidationPreHandler } from "../middlewares/zodValidationPreHandler.js";
import { buildAuthorityController } from "../controllers/authority.controller.js";
import { getAuthorityByRoleIdSchema } from "../swagger/authority.swagger.js";
import { getAuthorityParamsDto } from "../../models/dto/input/authority/getAuthorityParams.dto.js";
import { AuthorityRepository } from "../../repositories/authority.repository.js";
import { AuthorityService } from "../../services/authority.service.js";

export const authorityRoutes: FastifyPluginAsync = async (app) => {
  const authorityRepository = new AuthorityRepository();
  const authorityService = new AuthorityService({
    findByRoleId: authorityRepository.findByRoleId.bind(authorityRepository),
  });
  const authorityController = buildAuthorityController({
    getAuthorityByRoleId: authorityService.getByRoleId.bind(authorityService),
  });

  app.get(
    "/authority/:t_burm_role_id",
    {
      schema: getAuthorityByRoleIdSchema,
      preHandler: createZodValidationPreHandler({ params: getAuthorityParamsDto })
    },
    authorityController
  );
};
```

Ejemplo base de archivo Swagger por endpoint:
```ts
export const getEntitySchema = {
  tags: ["{{FUNCTIONALITY}}"],
  summary: "Get entity by id",
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", minLength: 1 },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
      },
    },
    404: {
      type: "object",
      properties: {
        message: { type: "string" },
      },
    },
  },
} as const;
```

## Checklist Rapido Routes
- [ ] Endpoint(s) declarados por funcionalidad.
- [ ] Validacion Zod en preHandler.
- [ ] Sin logica de negocio.
- [ ] Rutas registradas con prefix correcto.
- [ ] Composition root desacoplado en dependencies file.
- [ ] Archivo Swagger creado/actualizado en src/api/swagger.
- [ ] Endpoint con schema Swagger referenciado.
- [ ] Respuesta exitosa alineada con Output DTO de la funcionalidad.
