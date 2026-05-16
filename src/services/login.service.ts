import { BbomLoginInputSchema, type BbomLoginInput } from "../models/dto/input/login.dto.js";
import { BbomLoginOutputSchema, type BbomLoginOutput } from "../models/dto/output/login.dto.js";
import {
  createBurmLoginError,
  type BurmLoginErrorCode
} from "./login.error.js";
import {
  type BbomLoginPorts,
  type BbomLoginUseCase,
  type BurmUserIdentifierOutput,
  type EnrichedClaims
} from "./login.ports.js";

const getIdentifierType = (identifier: string): "email" | "phone" | "username" => {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
    return "email";
  }

  return /^\+?\d{8,20}$/.test(identifier) ? "phone" : "username";
};

const isInvalidCredentialIdentifierError = (error: unknown): boolean => {
  return !!error && typeof error === "object" && (error as { statusCode?: number }).statusCode === 404;
};

const isBlockedCredentialIdentifierError = (error: unknown): boolean => {
  return !!error && typeof error === "object" && (error as { statusCode?: number }).statusCode === 403;
};

const isBurmUnavailableError = (error: unknown): boolean => {
  return !!error && typeof error === "object" && (error as { statusCode?: number }).statusCode === 503;
};

const assertActiveProfile = (statusKey: string): void => {
  if (statusKey.toUpperCase() !== "ACTIVE") {
    throw createBurmLoginError("USER_NOT_ACTIVE", 403, {
      bcpm_status_key: statusKey
    });
  }
};

const handleInvalidCredentialsStep = async (
  dependencies: BbomLoginPorts,
  username: string
): Promise<void> => {
  try {
    const incrementResult = await dependencies.patchBurmCredentialAttempts(username);

    if (incrementResult.burm_user_id && incrementResult.burm_credential_attempts >= 5) {
      await dependencies.patchBurmProfileStatus(incrementResult.burm_user_id, "INACTIVE");
    }
  } catch {
    return;
  }
};

const resolveIdentityStep = async (
  dependencies: BbomLoginPorts,
  input: BbomLoginInput
): Promise<BurmUserIdentifierOutput> => {
  getIdentifierType(input.username);

  try {
    return await dependencies.getBurmIdentity(input);
  } catch (error) {
    if (isBurmUnavailableError(error)) {
      throw createBurmLoginError("BURM_UNAVAILABLE", 503, error);
    }

    if (!isInvalidCredentialIdentifierError(error) && !isBlockedCredentialIdentifierError(error)) {
      throw createBurmLoginError("BURM_UNAVAILABLE", 503, error);
    }

    if (isBlockedCredentialIdentifierError(error)) {
      const blockedStatusCode = (error as { statusCode: number }).statusCode;
      throw createBurmLoginError("INVALID_CREDENTIALS", blockedStatusCode, error);
    }

    await handleInvalidCredentialsStep(dependencies, input.username);

    const invalidStatusCode = (error as { statusCode: number }).statusCode;
    throw createBurmLoginError("INVALID_CREDENTIALS", invalidStatusCode, error);
  }
};

const buildTokenRequestStep = async (
  dependencies: BbomLoginPorts,
  identity: BurmUserIdentifierOutput
): Promise<EnrichedClaims> => {
  const bcpmStatus = await dependencies.getBcpmStatusById(identity.bcpm_status_id);
  assertActiveProfile(bcpmStatus.bcpm_status_key);

  const permissions = await dependencies.getBacmRoleAuthoritiesByRoleId(identity.bcpm_role_id);

  return {
    burm_user_id: identity.burm_user_id,
    bcpm_department_id: identity.bcpm_department_id,
    bcpm_role_id: identity.bcpm_role_id,
    claims: permissions
  };
};

const resolveMappedError = (error: unknown): never => {
  if (error && typeof error === "object" && "name" in error && (error as { name?: string }).name === "BurmLoginError") {
    throw error;
  }

  throw createBurmLoginError("UNKNOWN_LOGIN_ERROR", 503, error);
};

export const createBbomLoginUseCase = (
  ports: BbomLoginPorts
): BbomLoginUseCase => {
  return async (input: BbomLoginInput): Promise<BbomLoginOutput> => {
    try {
      const parsedInput = BbomLoginInputSchema.parse(input);
      const identity = await resolveIdentityStep(ports, parsedInput);
      const tokenRequest = await buildTokenRequestStep(ports, identity);
      const burmTokenResponse = await ports.postBurmLoginToken(tokenRequest);

      const token = (burmTokenResponse as { token?: unknown })?.token;
      if (typeof token !== "string" || token.length === 0) {
        throw createBurmLoginError("INVALID_TOKEN_RESPONSE", 502, burmTokenResponse);
      }

      return BbomLoginOutputSchema.parse({ token });
    } catch (error) {
      resolveMappedError(error);
    }
  };
};

export const buildLoginServiceErrorPayload = (
  code: BurmLoginErrorCode,
  details?: unknown
): { errorCode: string; message: string; details?: unknown } => {
  if (code === "INVALID_CREDENTIALS" || code === "USER_NOT_ACTIVE") {
    return {
      errorCode: "BBOM-AUTH-001",
      message: "Invalid credentials",
      details
    };
  }

  if (code === "BURM_UNAVAILABLE") {
    return {
      errorCode: "BBOM-INFRA-001",
      message: "Auth upstream unavailable",
      details
    };
  }

  return {
    errorCode: "BBOM-INFRA-002",
    message: "Unexpected error while processing login",
    details
  };
};
