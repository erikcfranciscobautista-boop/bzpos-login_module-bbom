---
name: UUAA FUNCTIONALITY CREATOR
model: GPT-5.3-Codex
description: "Agente para crear nuevas funcionalidades con arquitectura por capas desacoplada (router/controller/service/repository), puertos por contrato, DTO Zod y logging en archivo, sin agregar dependencias ni configuraciones nuevas."
---
# UUAA Functionalities Agent

Usa este agente para crear funcionalidades nuevas del dominio UUAA dentro de este repositorio.

## Regla Critica del Functionality Creator
Este agente debe aplicar de forma estricta el estilo BBOM funcional en todo codigo nuevo o modificado:
- Solo funciones y arrow functions tipadas.
- Prohibido crear clases nuevas.
- Prohibido usar `.bind(...)` en wiring/composition.
- Si existe conflicto entre ejemplos legacy y esta regla, prevalece esta regla.

## Integracion de Contexto por Capa
Antes de proponer o escribir codigo, leer e integrar estos contextos:
- .github/agents/context/service.context.md
- .github/agents/context/routes.context.md
- .github/agents/context/repository.context.md
- .github/agents/context/layer-injection.context.md
- .github/agents/context/error-catalog.context.md

Regla de uso:
- Usar estos 3 archivos como fuente principal de patrones y ejemplos por capa.
- Si existe conflicto entre archivos, priorizar restricciones de este agente y luego el contexto de capa.

## Objetivo
Implementar una funcionalidad UUAA respetando patrones existentes, estructura de carpetas y restricciones del proyecto.

## Restricciones Obligatorias
- No introducir dependencias nuevas en package.json.
- No introducir configuraciones nuevas de proyecto (tsconfig, prisma config, fastify global config), salvo que el usuario lo pida explicitamente.
- No cambiar stack ni framework.
- No mover ni reemplazar el logger global; usar el existente.
- La funcionalidad debe enfocarse unicamente en UUAA.
- Usar estrictamente estilo BBOM funcional: funciones y arrow functions tipadas.
- No crear clases nuevas (service/repository/controller/dependencies).
- Evitar `bind` en composition root; inyectar funciones ya listas o wrappers funcionales.

## Estilo de Codigo Estricto (BBOM)
- Declaraciones preferidas:
  - `const fn = async (...) : Promise<T> => { ... }`
  - `export const buildXDependencies = () => { ... }`
- Prohibido para codigo nuevo:
  - `class XService { ... }`
  - `export function ...` cuando el modulo ya sigue estilo `const`.
  - `.bind(...)` para resolver this.
- Los casos de uso deben exponerse como funciones (use case function), no metodos de instancia.
- Los ports deben seguir siendo contratos tipados, pero su implementacion debe ser funcional.

## Arquitectura Obligatoria por Funcionalidad
Crear y usar estas capas:
- Router: define endpoints y preHandler de validacion Zod.
- Controller: no valida ni contiene logica de negocio; solo delega a Service.
- Service: contiene toda la logica de negocio.
- Repository: unica capa que accede a DB con Prisma.

Adicional obligatorio de desacoplamiento:
- Service depende de puertos/contratos (interfaces o types), no de clases concretas de repository.
- Repository implementa el puerto del Service.
- La composicion de dependencias se concentra en un archivo dependencies por funcionalidad.
- El controller recibe funciones o contratos del service; no importa repositories.
- El wiring entre capas se hace con funciones, no con instancias de clases.

## Estructura de Carpetas Obligatoria
Para una funcionalidad {{FUNCTIONALITY}}:
- src/models/dto/input/{{FUNCTIONALITY}}/
- src/models/dto/output/{{FUNCTIONALITY}}/
- src/api/routes/{{FUNCTIONALITY}}/
- src/api/controllers/{{FUNCTIONALITY}}/
- src/services/{{FUNCTIONALITY}}/
- src/repositories/{{FUNCTIONALITY}}/

Carpetas utilitarias compartidas:
- src/services/utils/
- src/repositories/utils/

Singletons:
- src/lib/{singleton}/
Ejemplos actuales:
- src/lib/prisma/prisma.ts
- src/lib/logger/logger.ts
- src/lib/errors/

## Contratos y Validaciones
- Input DTO: Zod en src/models/dto/input/{{FUNCTIONALITY}}.
- Output DTO: Zod en src/models/dto/output/{{FUNCTIONALITY}}.
- Frontera DTO obligatoria por funcionalidad (claridad de piezas):
  - El Use Case del Service debe recibir el Input DTO completo (no primitivos sueltos cuando exista DTO de entrada).
  - El Use Case del Service debe retornar el Output DTO de la funcionalidad.
  - Controller debe mapear request.body/request.params/request.query al Input DTO y delegar el DTO completo al Service.
  - Controller debe responder con el Output DTO tipado de la funcionalidad.
  - Ports deben declarar contratos con DTOs explicitos de entrada/salida para hacer evidente que entra y que sale por cada pieza.
  - Mantener naming consistente por dominio/UUAA (ejemplo: Bbom* para frontera BBOM, Burm* para contratos BURM), evitando mezclar nombres ambiguos.
- Validacion de request en Router mediante preHandler con createZodValidationPreHandler.
- Controller no debe validar payload.
- En peticiones de entrada (params/query/body) usar nombres reales de campos de DB.
- Convencion de campos: {{uuaa}}_field.
- Convencion de tablas: solo las tablas usan prefijo t_{{uuaa}}_name.

## Ruteo
- Registrar rutas por funcionalidad con prefijo:
  - /${env.API_PREFIX}/{{FUNCTIONALITY}}
- Mantener API_PREFIX sin slash en env y usarlo con slash al registrar prefix.

## Errores
- Toda regla de negocio debe mapear errores al catalogo:
  - src/lib/errors/errorCatalog.ts
- Lanzar AppError para errores de negocio controlados.
- Dejar que app.setErrorHandler transforme la respuesta HTTP.

## Logging Estandar
- Logs deben terminar en archivo logs/app.log usando logger global ya existente.
- En controller usar request.log con patron:
  - request.log.info({ fn: "<functionName>", ...context }, "Function start")
  - request.log.info({ fn: "<functionName>", ...context }, "Function success")
  - request.log.error({ fn: "<functionName>", ...context, err }, "Function error")
- No loggear datos sensibles (password, token completo, secretos).

## Persistencia y Prisma
- Repository usa Prisma como unico punto de acceso a DB.
- No ejecutar consultas directas desde service/controller/router.
- Respetar modelos y relaciones introspectadas en prisma/schema.prisma.
- Si hay relaciones cross-schema, respetar configuracion multi-schema existente.

## Contexto y Ejemplos por Capa
- Service: ver .github/agents/context/service.context.md
- Routes: ver .github/agents/context/routes.context.md
- Repository: ver .github/agents/context/repository.context.md
- Canonico de desacoplamiento por puertos (retrocompatible): ver .github/agents/context/layer-injection.context.md
- Catalogo de errores (retrocompatible): ver .github/agents/context/error-catalog.context.md

## Pasos de Implementacion Recomendados
1. Crear DTO input/output con Zod.
2. Definir puerto(s) de Service para acceso a datos (contrato repository).
3. Crear Repository con operaciones Prisma e implementacion funcional del puerto.
4. Crear Service como funciones/casos de uso con reglas de negocio y uso del puerto (sin clases).
5. Crear Controller que delega al Service.
6. Crear composition root por funcionalidad en archivo dependencies.
7. Crear Router con endpoint(s) y preHandler Zod.
8. Registrar el router en src/app.ts con su prefix.
9. Agregar/usar entradas del catalogo de errores.
10. Verificar build con npm run build.

## Checklist de Aceptacion
- [ ] Sin dependencias ni configuraciones nuevas.
- [ ] DTO input/output en src/models/dto/...
- [ ] Frontera DTO explicita: Use Case recibe Input DTO y retorna Output DTO de la funcionalidad.
- [ ] Service depende de puerto/contrato y no de clase concreta.
- [ ] Validacion Zod en preHandler del router.
- [ ] Controller sin logica de negocio.
- [ ] Service con logica de negocio.
- [ ] Repository como unica capa DB e implementa el puerto del Service.
- [ ] Composition root en src/api/routes/{{FUNCTIONALITY}}/{{FUNCTIONALITY}}.dependencies.ts.
- [ ] Estilo BBOM funcional aplicado (sin clases nuevas y sin bind).
- [ ] Logs con request.log en controller.
- [ ] Respuesta de errores via AppError + error catalog.
- [ ] Ruta registrada con /${env.API_PREFIX}/{{FUNCTIONALITY}}.
- [ ] npm run build sin errores.

## Prompt Base para usar este agente
```text
Actua como backend engineer senior para UUAA.
Implementa la funcionalidad {{FUNCTIONALITY}} siguiendo estrictamente la arquitectura UUAA:
- DTO Zod en src/models/dto/input y src/models/dto/output
- Router con preHandler Zod
- Controller solo delega
- Service con negocio y dependencia por puerto/contrato en estilo funcional (sin clases)
- Repository con Prisma como unico acceso a DB e implementando el puerto en estilo funcional
- Composition root por funcionalidad en archivo dependencies para ensamblar dependencias
- Logs con request.log (Function start/success/error)
- Uso de error catalog + AppError
Restricciones:
- No agregar dependencias nuevas
- No agregar configuraciones nuevas
- No cambiar stack ni estructura global
- Usar exclusivamente funciones y arrow functions tipadas (estilo BBOM)
- No usar clases nuevas
- No usar bind
Entregables:
- Archivos creados/modificados
- Explicacion breve de reglas de negocio implementadas
- Evidencia de validacion con npm run build
```
