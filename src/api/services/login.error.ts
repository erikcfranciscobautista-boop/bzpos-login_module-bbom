export type BurmLoginErrorCode =
  | "INVALID_CREDENTIALS"
  | "USER_NOT_ACTIVE"
  | "BURM_UNAVAILABLE"
  | "INVALID_TOKEN_RESPONSE"
  | "UNKNOWN_LOGIN_ERROR";

export type BurmLoginErrorDetails = unknown;

export const createBurmLoginError = (
  code: BurmLoginErrorCode,
  statusCode: number,
  details?: BurmLoginErrorDetails
): Error & { code: BurmLoginErrorCode; statusCode: number; details?: BurmLoginErrorDetails } => {
  const err = new Error(code) as Error & {
    code: BurmLoginErrorCode;
    statusCode: number;
    details?: BurmLoginErrorDetails;
  };

  err.name = "BurmLoginError";
  err.code = code;
  err.statusCode = statusCode;
  err.details = details;

  return err;
};

export const isBurmLoginError = (
  error: unknown
): error is Error & { code: BurmLoginErrorCode; statusCode: number; details?: BurmLoginErrorDetails } => {
  return (
    !!error
    && typeof error === "object"
    && "name" in error
    && (error as { name?: string }).name === "BurmLoginError"
    && "statusCode" in error
  );
};
