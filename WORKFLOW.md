# WORKFLOW - bzpos-login_module-bbom

Este documento describe el flujo funcional actual del modulo de login BBOM.

## Flujo funcional

```mermaid
flowchart TD
    A[POST /login] --> B[Route valida body con Zod]
    B --> C[Controller delega al use case]
    C --> D[Service parsea Input DTO y registra log start]
    D --> E[Repository resuelve identidad en BURM]
    E --> F{Identidad valida?}
    F -- No 404 --> G[Incrementa intentos en BURM]
    G --> H{Intentos >= 5?}
    H -- Si --> I[Inactiva perfil en BURM]
    H -- No --> J[Retorna INVALID_CREDENTIALS]
    I --> J
    F -- No 403 --> J
    F -- No 503 --> K[Retorna BURM_UNAVAILABLE]
    F -- Si --> L[Repository consulta status en BCPM]
    L --> M{Status ACTIVE?}
    M -- No --> N[Retorna USER_NOT_ACTIVE]
    M -- Si --> O[Repository consulta authorities en BACM]
    O --> P[Repository solicita token en BURM]
    P --> Q{Token valido?}
    Q -- No --> R[Retorna INVALID_TOKEN_RESPONSE]
    Q -- Si --> S[Service retorna Output DTO token]
    S --> T[Controller responde 200]
```

## Contratos externos involucrados

- BURM Identity: validacion de credenciales e identidad.
- BCPM Status: estado del perfil.
- BACM Authorities: permisos por rol.
- BURM Token: emision de token de autenticacion.

## Reglas de sincronizacion documental

Cuando cambie el flujo funcional del login, este archivo y README deben actualizarse juntos.
