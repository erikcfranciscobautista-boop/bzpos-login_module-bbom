export type BurmLoginErrorCode =
  | "INVALID_ARGUMENTS"
  | "INVALID_CREDENTIALS"
  | "USER_NOT_ACTIVE"
  | "BURM_UNAVAILABLE"
  | "BCPM_UNAVAILABLE"
  | "BACM_UNAVAILABLE"
  | "INVALID_TOKEN_RESPONSE"
  | "UNKNOWN_LOGIN_ERROR";

export type BurmLoginErrorDetails = unknown;

export type BurmLoginError = Error & {
  code: BurmLoginErrorCode;
  statusCode: number;
  details?: BurmLoginErrorDetails;
};

export const createBurmLoginError = (
  code: BurmLoginErrorCode,
  statusCode: number,
  details?: BurmLoginErrorDetails
): BurmLoginError => {
  const err = new Error(code) as BurmLoginError;

  err.name = "BurmLoginError";
  err.code = code;
  err.statusCode = statusCode;
  err.details = details;

  return err;
};

export const isBurmLoginError = (error: unknown): error is BurmLoginError => {
  return (
    !!error
    && typeof error === "object"
    && "name" in error
    && (error as { name?: string }).name === "BurmLoginError"
    && "statusCode" in error
  );
};

export const getStatusCodeFromError = (error: unknown): number | null => {
  if (!error || typeof error !== "object") {
    return null;
  }

  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof statusCode === "number" ? statusCode : null;
};

export const isUnavailableUpstreamError = (error: unknown): boolean => {
  return getStatusCodeFromError(error) === 503;
};

export const isInvalidIdentityError = (error: unknown): boolean => {
  return getStatusCodeFromError(error) === 404;
};

export const isBlockedIdentityError = (error: unknown): boolean => {
  return getStatusCodeFromError(error) === 403;
};

export const assertActiveProfile = (statusKey: string): void => {
  if (statusKey.toUpperCase() !== "ACTIVE") {
    throw createBurmLoginError("USER_NOT_ACTIVE", 403, {
      bcpm_status_key: statusKey
    });
  }
};

export const mapUnexpectedLoginError = (error: unknown): never => {
  if (isBurmLoginError(error)) {
    throw error;
  }

  throw createBurmLoginError("UNKNOWN_LOGIN_ERROR", 503, error);
};

export const buildLoginServiceErrorPayload = (
  code: BurmLoginErrorCode,
  details?: unknown
): {
  errorType: "CLIENT_ERROR" | "CONNECTION_ERROR";
  errorCode: string;
  detail: {
    traceError: string;
    message: string;
    missing?: string[];
  };
} => {
  if (code === "INVALID_ARGUMENTS") {
    const missing = Array.isArray(details) ? details.filter((field) => typeof field === "string") : undefined;

    return {
      errorType: "CLIENT_ERROR",
      errorCode: "BBOM-CLIENT-0001",
      detail: {
        traceError: "0000-INVALID-ARGUMENTS",
        message: "Credenciales invalidas",
        ...(missing && missing.length > 0 ? { missing } : {})
      }
    };
  }

  if (code === "INVALID_CREDENTIALS") {
    return {
      errorType: "CLIENT_ERROR",
      errorCode: "BBOM-CLIENT-0001",
      detail: {
        traceError: "0001-CLIENT-ERROR-AUTH-0001",
        message: "Credenciales invalidas"
      }
    };
  }

  if (code === "USER_NOT_ACTIVE") {
    return {
      errorType: "CLIENT_ERROR",
      errorCode: "BBOM-CLIENT-0001",
      detail: {
        traceError: "0001-CLIENT-ERROR-AUTH-0002",
        message: "Credenciales invalidas"
      }
    };
  }

  if (code === "BURM_UNAVAILABLE") {
    return {
      errorType: "CONNECTION_ERROR",
      errorCode: "BBOM-CONNECTION-0001",
      detail: {
        traceError: "0001-NOT-CONNECTION",
        message: "Ocurrio un error, vuelve a intentarlo mas tarde"
      }
    };
  }

  if (code === "BCPM_UNAVAILABLE") {
    return {
      errorType: "CONNECTION_ERROR",
      errorCode: "BBOM-CONNECTION-0001",
      detail: {
        traceError: "0002-NOT-CONNECTION",
        message: "Ocurrio un error, vuelve a intentarlo mas tarde"
      }
    };
  }

  if (code === "BACM_UNAVAILABLE") {
    return {
      errorType: "CONNECTION_ERROR",
      errorCode: "BBOM-CONNECTION-0001",
      detail: {
        traceError: "0003-NOT-CONNECTION",
        message: "Ocurrio un error, vuelve a intentarlo mas tarde"
      }
    };
  }

  return {
    errorType: "CONNECTION_ERROR",
    errorCode: "BBOM-CONNECTION-0001",
    detail: {
      traceError: "0001-NOT-CONNECTION",
      message: "Ocurrio un error, vuelve a intentarlo mas tarde"
    }
  };
};
