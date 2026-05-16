# Error Catalog Context

## Objetivo
Estandarizar el catalogo de errores para APIs y servicios UUAA con formato consistente de codigo, mensaje y definicion.

Alcance de este catalogo:
- Errores funcionales y operativos comunes.
- Errores de entrada, API, servicio, DB e infraestructura de servidor.
- No incluye errores criticos, de seguridad, ni de vulnerabilidad.

## Formato Canonico de Error
- errorCode: codigo estable y unico.
- message: mensaje corto orientado al cliente/consumidor.
- definition: explicacion funcional para equipos de desarrollo y soporte.
- httpStatus: estado HTTP sugerido.

## Convencion de Codigo
- Estructura: BCPM-<DOMINIO>-<NNN>
- Dominios permitidos:
  - INPUT: validacion de entrada.
  - API: contrato HTTP/ruta/metodo.
  - SVC: reglas de negocio en service.
  - DB: acceso y estado de base de datos.
  - INFRA: disponibilidad operativa de servidor/servicio.

Ejemplos:
- BCPM-INPUT-001
- BCPM-SVC-002
- BCPM-DB-003

## Catalogo Base Estandar

### INPUT
1. errorCode: BCPM-INPUT-001
   message: "Invalid request format"
   definition: "La estructura del request no cumple el DTO esperado (params/query/body)."
   httpStatus: 400

2. errorCode: BCPM-INPUT-002
   message: "Missing required field"
   definition: "Falta al menos un campo obligatorio definido en el DTO de entrada."
   httpStatus: 400

3. errorCode: BCPM-INPUT-003
   message: "Invalid field value"
   definition: "Uno o mas campos tienen formato o valor fuera de rango permitido."
   httpStatus: 400

### API
1. errorCode: BCPM-API-001
   message: "Route not found"
   definition: "La ruta solicitada no existe en la API."
   httpStatus: 404

2. errorCode: BCPM-API-002
   message: "Method not allowed"
   definition: "La ruta existe, pero el metodo HTTP usado no esta habilitado."
   httpStatus: 405

3. errorCode: BCPM-API-003
   message: "Unsupported content type"
   definition: "El tipo de contenido enviado no es compatible con el endpoint."
   httpStatus: 415

### SVC
1. errorCode: BCPM-SVC-001
   message: "Resource not found"
   definition: "La entidad solicitada no existe en el contexto de negocio."
   httpStatus: 404

2. errorCode: BCPM-SVC-002
   message: "Business rule violation"
   definition: "La operacion incumple una regla funcional definida por el dominio."
   httpStatus: 422

3. errorCode: BCPM-SVC-003
   message: "Resource state conflict"
   definition: "El estado actual del recurso no permite completar la operacion."
   httpStatus: 409

### DB
1. errorCode: BCPM-DB-001
   message: "Database connection unavailable"
   definition: "No fue posible establecer conexion con la base de datos."
   httpStatus: 503

2. errorCode: BCPM-DB-002
   message: "Database timeout"
   definition: "La consulta excedio el tiempo de espera permitido."
   httpStatus: 504

3. errorCode: BCPM-DB-003
   message: "Data integrity conflict"
   definition: "Se detecto conflicto de integridad de datos al persistir o actualizar."
   httpStatus: 409

### INFRA
1. errorCode: BCPM-INFRA-001
   message: "Service temporarily unavailable"
   definition: "El servicio no puede procesar la solicitud temporalmente."
   httpStatus: 503

2. errorCode: BCPM-INFRA-002
   message: "Upstream dependency unavailable"
   definition: "Una dependencia operativa requerida no esta disponible."
   httpStatus: 503

3. errorCode: BCPM-INFRA-003
   message: "Operation timeout"
   definition: "La operacion no pudo completarse dentro del tiempo esperado."
   httpStatus: 504

## Reglas de Uso en Codigo
- En service, mapear errores de negocio a errorCode de dominio SVC.
- En repository, mapear errores operativos de DB a codigos DB.
- En router/middleware, mapear validacion de entrada a codigos INPUT.
- El error handler global transforma AppError a respuesta HTTP estandar.

## Payload Estandar de Respuesta de Error
```json
{
  "errorCode": "BCPM-SVC-001",
  "message": "Resource not found",
  "details": "Status with bcpm_status_id=XYZ was not found"
}
```

## Reglas de Retrocompatibilidad
- Los codigos existentes no se renombran ni se reciclan.
- Nuevos errores agregan un nuevo correlativo por dominio.
- Mantener message estable para consumidores externos.
- Si cambia el significado funcional, crear nuevo errorCode.

## Exclusiones
- Este catalogo no define errores criticos.
- Este catalogo no define errores de vulnerabilidad ni de seguridad ofensiva.