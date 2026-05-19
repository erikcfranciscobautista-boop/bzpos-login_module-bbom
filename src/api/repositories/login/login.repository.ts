import type { BbomLoginInput } from "../../../models/dto/input/login.dto.js";
import type {
  BbomLoginAdapters,
  BurmClaimsDto,
  BurmUserIdentityDto
} from "../../services/login.contracts.js";
import {
  assertActiveProfile,
  createBurmLoginError,
  isBlockedIdentityError,
  isInvalidIdentityError,
  isUnavailableUpstreamError
} from "../../services/login.errors.js";

const MAX_LOGIN_ATTEMPTS = 5;

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

export const resolveIdentityRepository = async (
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

const resolveStatusRepository = async (
  adapters: BbomLoginAdapters,
  statusId: string
): Promise<{ bcpm_status_key: string }> => {
  try {
    return await adapters.getBcpmStatusById(statusId);
  } catch (error) {
    if (isUnavailableUpstreamError(error)) {
      throw createBurmLoginError("BCPM_UNAVAILABLE", 503, error);
    }

    throw createBurmLoginError("UNKNOWN_LOGIN_ERROR", 503, error);
  }
};

const resolveAuthoritiesRepository = async (
  adapters: BbomLoginAdapters,
  roleId: string
): Promise<string[]> => {
  try {
    return await adapters.getBacmRoleAuthoritiesByRoleId(roleId);
  } catch (error) {
    if (isUnavailableUpstreamError(error)) {
      throw createBurmLoginError("BACM_UNAVAILABLE", 503, error);
    }

    throw createBurmLoginError("UNKNOWN_LOGIN_ERROR", 503, error);
  }
};

export const resolveTokenClaimsRepository = async (
  adapters: BbomLoginAdapters,
  identity: BurmUserIdentityDto
): Promise<BurmClaimsDto> => {
  const status = await resolveStatusRepository(adapters, identity.bcpm_status_id);
  assertActiveProfile(status.bcpm_status_key);

  const claims = await resolveAuthoritiesRepository(adapters, identity.bcpm_role_id);

  return {
    burm_user_id: identity.burm_user_id,
    bcpm_department_id: identity.bcpm_department_id,
    bcpm_role_id: identity.bcpm_role_id,
    claims
  };
};

const resolveTokenResponseRepository = async (
  adapters: BbomLoginAdapters,
  tokenClaims: BurmClaimsDto
): Promise<unknown> => {
  try {
    return await adapters.postBurmLoginToken(tokenClaims);
  } catch (error) {
    if (isUnavailableUpstreamError(error)) {
      throw createBurmLoginError("BURM_UNAVAILABLE", 503, error);
    }

    throw createBurmLoginError("UNKNOWN_LOGIN_ERROR", 503, error);
  }
};

const extractTokenFromResponse = (upstreamResponse: unknown): string => {
  const token = (upstreamResponse as { token?: unknown } | null)?.token;

  if (typeof token !== "string" || token.length === 0) {
    throw createBurmLoginError("INVALID_TOKEN_RESPONSE", 502, upstreamResponse);
  }

  return token;
};

export const resolveTokenRepository = async (
  adapters: BbomLoginAdapters,
  tokenClaims: BurmClaimsDto
): Promise<string> => {
  const tokenResponse = await resolveTokenResponseRepository(adapters, tokenClaims);
  return extractTokenFromResponse(tokenResponse);
};
