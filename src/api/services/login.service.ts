import { BbomLoginInputSchema, type BbomLoginInput } from "../../models/dto/input/login.dto.js";
import { BbomLoginOutputSchema, type BbomLoginOutput } from "../../models/dto/output/login.dto.js";
import {
  createBurmLoginError,
  type BurmLoginErrorCode
} from "./login.error.js";
import {
  type BbomLoginAdapters,
  type BbomLoginUseCase,
  type BurmClaimsDto,
  type BurmUserIdentityDto
} from "./login.contracts.js";

const MAX_LOGIN_ATTEMPTS = 5;

const getStatusCode = (error: unknown): number | null => {
  if (!error || typeof error !== "object") {
    return null;
  }

  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof statusCode === "number" ? statusCode : null;
};

const isUnavailableUpstreamError = (error: unknown): boolean => {
  return getStatusCode(error) === 503;
};

const isInvalidIdentityError = (error: unknown): boolean => {
  return getStatusCode(error) === 404;
};

const isBlockedIdentityError = (error: unknown): boolean => {
  return getStatusCode(error) === 403;
};

const assertActiveProfile = (statusKey: string): void => {
  if (statusKey.toUpperCase() !== "ACTIVE") {
    throw createBurmLoginError("USER_NOT_ACTIVE", 403, {
      bcpm_status_key: statusKey
    });
  }
};

const incrementCredentialAttemptsSafely = async (
  adapters: BbomLoginAdapters,
  username: string
): Promise<void> => {
  try {
    const updatedAttempts = await adapters.patchBurmCredentialAttempts(username);

    if (
      updatedAttempts.burm_user_id
      && updatedAttempts.burm_credential_attempts >= MAX_LOGIN_ATTEMPTS
    ) {
      await adapters.patchBurmProfileStatus(updatedAttempts.burm_user_id, "INACTIVE");
    }
  } catch {
    return;
  }
};

const resolveUserIdentity = async (
  adapters: BbomLoginAdapters,
  input: BbomLoginInput
): Promise<BurmUserIdentityDto> => {
  try {
    return await adapters.getBurmIdentity(input);
  } catch (error) {
    if (isUnavailableUpstreamError(error)) {
      throw createBurmLoginError("BURM_UNAVAILABLE", 503, error);
    }

    if (isBlockedIdentityError(error)) {
      throw createBurmLoginError("INVALID_CREDENTIALS", 403, error);
    }

    if (!isInvalidIdentityError(error)) {
      throw createBurmLoginError("BURM_UNAVAILABLE", 503, error);
    }

    await incrementCredentialAttemptsSafely(adapters, input.username);
    throw createBurmLoginError("INVALID_CREDENTIALS", 404, error);
  }
};

const buildTokenClaims = async (
  adapters: BbomLoginAdapters,
  identity: BurmUserIdentityDto
): Promise<BurmClaimsDto> => {
  const status = await adapters.getBcpmStatusById(identity.bcpm_status_id);
  assertActiveProfile(status.bcpm_status_key);

  const claims = await adapters.getBacmRoleAuthoritiesByRoleId(identity.bcpm_role_id);

  return {
    burm_user_id: identity.burm_user_id,
    bcpm_department_id: identity.bcpm_department_id,
    bcpm_role_id: identity.bcpm_role_id,
    claims
  };
};

const resolveTokenFromResponse = (upstreamResponse: unknown): string => {
  const token = (upstreamResponse as { token?: unknown } | null)?.token;

  if (typeof token !== "string" || token.length === 0) {
    throw createBurmLoginError("INVALID_TOKEN_RESPONSE", 502, upstreamResponse);
  }

  return token;
};

const mapUnexpectedLoginError = (error: unknown): never => {
  if (
    error
    && typeof error === "object"
    && "name" in error
    && (error as { name?: string }).name === "BurmLoginError"
  ) {
    throw error;
  }

  throw createBurmLoginError("UNKNOWN_LOGIN_ERROR", 503, error);
};

export const createBbomLoginUseCase = (): BbomLoginUseCase => {
  return async (input: BbomLoginInput, adapters: BbomLoginAdapters): Promise<BbomLoginOutput> => {
    try {
      const parsedInput = BbomLoginInputSchema.parse(input);
      const identity = await resolveUserIdentity(adapters, parsedInput);
      const tokenClaims = await buildTokenClaims(adapters, identity);
      const upstreamTokenResponse = await adapters.postBurmLoginToken(tokenClaims);
      const token = resolveTokenFromResponse(upstreamTokenResponse);

      return BbomLoginOutputSchema.parse({ token });
    } catch (error) {
      throw mapUnexpectedLoginError(error);
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
