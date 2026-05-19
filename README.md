# bzpos-login_module-bbom

Este modulo expone un unico plugin de rutas: `loginRoutes`.

## Uso

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

app.register(loginRoutes, { prefix: "/api" });
```

## Endpoint

- `POST /login`

