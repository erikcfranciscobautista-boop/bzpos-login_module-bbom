import type { BbomLoginInput } from "../../../models/dto/input/login.dto.js";
import type {
  BbomLoginAdapters,
  BbomLoginLogger,
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
  username: string,
  logger: BbomLoginLogger
): Promise<void> => {
  logger.info(
    { fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_credential_attempts" },
    "Function start"
  );

  try {
    const updatedAttempts = await adapters.patchBurmCredentialAttempts(username);

    if (
      updatedAttempts.burm_user_id
      && updatedAttempts.burm_credential_attempts >= MAX_LOGIN_ATTEMPTS
    ) {
      await adapters.patchBurmProfileStatus(updatedAttempts.burm_user_id, "INACTIVE");
    }

    logger.info(
      { fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_credential_attempts" },
      "Function success"
    );
  } catch {
    logger.error(
      { fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_credential_attempts" },
      "Function error"
    );
    return;
  }
};

export const resolveIdentityRepository = async (
  adapters: BbomLoginAdapters,
  input: BbomLoginInput,
  logger: BbomLoginLogger
): Promise<BurmUserIdentityDto> => {
  logger.info({ fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_identity" }, "Function start");

  try {
    const identity = await adapters.getBurmIdentity(input);
    logger.info({ fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_identity" }, "Function success");
    return identity;
  } catch (error) {
    logger.error({ fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_identity", err: error }, "Function error");

    if (isUnavailableUpstreamError(error)) {
      throw createBurmLoginError("BURM_UNAVAILABLE", 503, error);
    }

    if (isBlockedIdentityError(error)) {
      throw createBurmLoginError("INVALID_CREDENTIALS", 403, error);
    }

    if (!isInvalidIdentityError(error)) {
      throw createBurmLoginError("BURM_UNAVAILABLE", 503, error);
    }

    await incrementCredentialAttemptsSafely(adapters, input.username, logger);
    throw createBurmLoginError("INVALID_CREDENTIALS", 404, error);
  }
};

const resolveStatusRepository = async (
  adapters: BbomLoginAdapters,
  statusId: string,
  logger: BbomLoginLogger
): Promise<{ bcpm_status_key: string }> => {
  logger.info({ fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_status" }, "Function start");

  try {
    const status = await adapters.getBcpmStatusById(statusId);
    logger.info({ fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_status" }, "Function success");
    return status;
  } catch (error) {
    logger.error({ fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_status", err: error }, "Function error");

    if (isUnavailableUpstreamError(error)) {
      throw createBurmLoginError("BCPM_UNAVAILABLE", 503, error);
    }

    throw createBurmLoginError("UNKNOWN_LOGIN_ERROR", 503, error);
  }
};

const resolveAuthoritiesRepository = async (
  adapters: BbomLoginAdapters,
  roleId: string,
  logger: BbomLoginLogger
): Promise<string[]> => {
  logger.info({ fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_authorities" }, "Function start");

  try {
    const authorities = await adapters.getBacmRoleAuthoritiesByRoleId(roleId);
    logger.info({ fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_authorities" }, "Function success");
    return authorities;
  } catch (error) {
    logger.error({ fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_authorities", err: error }, "Function error");

    if (isUnavailableUpstreamError(error)) {
      throw createBurmLoginError("BACM_UNAVAILABLE", 503, error);
    }

    throw createBurmLoginError("UNKNOWN_LOGIN_ERROR", 503, error);
  }
};

export const resolveTokenClaimsRepository = async (
  adapters: BbomLoginAdapters,
  identity: BurmUserIdentityDto,
  logger: BbomLoginLogger
): Promise<BurmClaimsDto> => {
  logger.info({ fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_token_claims" }, "Function start");

  const status = await resolveStatusRepository(adapters, identity.bcpm_status_id, logger);
  assertActiveProfile(status.bcpm_status_key);

  const claims = await resolveAuthoritiesRepository(adapters, identity.bcpm_role_id, logger);

  const tokenClaims = {
    burm_user_id: identity.burm_user_id,
    bcpm_department_id: identity.bcpm_department_id,
    bcpm_role_id: identity.bcpm_role_id,
    claims
  };

  logger.info({ fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_token_claims" }, "Function success");
  return tokenClaims;
};

const resolveTokenResponseRepository = async (
  adapters: BbomLoginAdapters,
  tokenClaims: BurmClaimsDto,
  logger: BbomLoginLogger
): Promise<unknown> => {
  logger.info({ fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_token_response" }, "Function start");

  try {
    const tokenResponse = await adapters.postBurmLoginToken(tokenClaims);
    logger.info({ fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_token_response" }, "Function success");
    return tokenResponse;
  } catch (error) {
    logger.error({ fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_token_response", err: error }, "Function error");

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
  tokenClaims: BurmClaimsDto,
  logger: BbomLoginLogger
): Promise<string> => {
  logger.info({ fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_token" }, "Function start");

  const tokenResponse = await resolveTokenResponseRepository(adapters, tokenClaims, logger);
  const token = extractTokenFromResponse(tokenResponse);

  logger.info({ fn: "LOGIN_REPOSITORY_MODULE - bzpos-login_module-bbom - repository_token" }, "Function success");
  return token;
};
