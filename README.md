# bzpos-login_module-bbom

Modulo BBOM de autenticacion. Expone un plugin Fastify con el endpoint de login y delega dependencias externas via adapters.

## Objetivo del modulo

- Validar credenciales de usuario contra BURM.
- Resolver estado de perfil y authorities.
- Emitir token de autenticacion.
- Aplicar control de intentos fallidos y bloqueo de perfil cuando corresponde.

## Alcance

Incluye:

- Endpoint `POST /login`.
- Validacion de entrada con Zod.
- Orquestacion de login por capas (routes/controller/service/repository).
- Mapeo de errores funcionales y de disponibilidad.

No incluye:

- Persistencia local de sesiones.
- Refresh token.
- Registro de usuario.

## Arquitectura

Flujo por capas:

`Routes -> Controller -> Service -> Repository(adapters externos)`

Responsabilidad por capa:

- Routes: define endpoint, schema y preHandler.
- Controller: delega al use case y responde.
- Service: ejecuta reglas de negocio del login.
- Repository: encapsula llamadas a adapters BURM/BCPM/BACM y mapea errores.
- Models: DTOs de entrada/salida y schema Swagger.

## Integracion rapida

```ts
import Fastify from "fastify";
import { loginRoutes } from "@uuaa/bzpos-login_module-bbom";

const app = Fastify();

app.decorate("bbomLoginAdapters", {
	getBurmIdentity: async (input) => {
		return {
			burm_user_id: "user-id",
			bcpm_department_id: "department-id",
			bcpm_role_id: "role-id",
			bcpm_status_id: "status-id"
		};
	},
	getBcpmStatusById: async () => ({ bcpm_status_key: "ACTIVE" }),
	getBacmRoleAuthoritiesByRoleId: async () => ["AUTH_LOGIN"],
	patchBurmCredentialAttempts: async () => ({ burm_user_id: "user-id", burm_credential_attempts: 1 }),
	patchBurmProfileStatus: async () => undefined,
	postBurmLoginToken: async () => ({ token: "jwt-token" })
});

app.decorate("loginModuleRoutesBbom", true);
app.register(loginRoutes, { prefix: "/api" });
```

## Endpoint

- Metodo: `POST`
- Path: `/login`

Request body:

```json
{
	"username": "user@example.com",
	"password": "***"
}
```

Response 200:

```json
{
	"token": "jwt-token"
}
```

## Contrato de adapters externos

El host debe proveer `bbomLoginAdapters` con estas operaciones:

- `getBurmIdentity(input)`
- `getBcpmStatusById(statusId)`
- `getBacmRoleAuthoritiesByRoleId(roleId)`
- `patchBurmCredentialAttempts(username)`
- `patchBurmProfileStatus(userId, statusKey)`
- `postBurmLoginToken(claims)`

## Reglas de negocio implementadas

- Si BURM responde identidad valida, se continua con status + authorities + token.
- Si credenciales invalidas (404), se incrementa contador de intentos.
- Si intentos alcanzan 5, se inactiva perfil.
- Si perfil no esta ACTIVE, el login se rechaza.
- Si una dependencia esta no disponible, se devuelve error de conexion controlado.

## Errores funcionales

Codigos internos del modulo:

- `INVALID_ARGUMENTS`
- `INVALID_CREDENTIALS`
- `USER_NOT_ACTIVE`
- `BURM_UNAVAILABLE`
- `BCPM_UNAVAILABLE`
- `BACM_UNAVAILABLE`
- `INVALID_TOKEN_RESPONSE`
- `UNKNOWN_LOGIN_ERROR`

Payload estandar de error (salida al cliente):

```json
{
	"errorType": "CLIENT_ERROR",
	"errorCode": "BBOM-CLIENT-0001",
	"detail": {
		"traceError": "0001-CLIENT-ERROR-AUTH-0001",
		"message": "Credenciales invalidas"
	}
}
```

## Logging

Se aplican logs de ciclo de vida por componente:

- Function start
- Function success
- Function error

Convencion activa en este modulo:

- Controller: `LOGIN_CONTROLLER - bzpos-login_module-bbom -`
- Service: `LOGIN_USE_CASE - bzpos-login_module-bbom -`

No se registran secretos sensibles como password o token completo.

## Estructura del modulo

- `src/api/routes/login.routes.ts`
- `src/api/routes/login.dependencies.ts`
- `src/api/controllers/login.controller.ts`
- `src/api/services/login.service.ts`
- `src/api/services/login.contracts.ts`
- `src/api/services/login.errors.ts`
- `src/api/repositories/login/login.repository.ts`
- `src/models/dto/input/login.dto.ts`
- `src/models/dto/output/login.dto.ts`
- `src/models/dto/swagger/login.swagger.ts`

## Documentacion complementaria

- [BBOM Components](docs/BBOM-COMPONENTS.md)
- [FUNCTIONALITY_MODULE_BBOM Agent](docs/agents/FUNCTIONALITY_MODULE_BBOM.agent.md)
- [Module Contexts](docs/agents/context/module/controller.context.md)
- [WORKFLOW Agent](docs/agents/WORKFLOW.md)
- [WORKFLOW Modulo](WORKFLOW.md)

