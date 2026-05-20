import { BbomLoginInputSchema, type BbomLoginInput } from "../../models/dto/input/login.dto.js";
import { BbomLoginOutputSchema, type BbomLoginOutput } from "../../models/dto/output/login.dto.js";
import {
  type BbomLoginAdapters,
  type BbomLoginLogger,
  type BbomLoginUseCase
} from "./login.contracts.js";
import {
  resolveIdentityRepository,
  resolveTokenClaimsRepository,
  resolveTokenRepository
} from "../repositories/login/login.repository.js";
import {
  mapUnexpectedLoginError
} from "./login.errors.js";

export const createBbomLoginUseCase = (): BbomLoginUseCase => {
  return (
    input: BbomLoginInput,
    adapters: BbomLoginAdapters,
    logger: BbomLoginLogger
  ): Promise<BbomLoginOutput> => {
    logger.info(
      { fn: "LOGIN_USE_CASE - bzpos-login_module-bbom -", username: input.username },
      "Function start"
    );

    const parsedInput = BbomLoginInputSchema.parse(input);

    return resolveIdentityRepository(adapters, parsedInput)
      .then((identity) => resolveTokenClaimsRepository(adapters, identity))
      .then((tokenClaims) => resolveTokenRepository(adapters, tokenClaims))
      .then((token) => {
        logger.info({ fn: "LOGIN_USE_CASE - bzpos-login_module-bbom -" }, "Function success");
        return BbomLoginOutputSchema.parse({ token });
      })
      .catch((error: unknown) => {
        logger.error({ fn: "LOGIN_USE_CASE - bzpos-login_module-bbom -", err: error }, "Function error");
        throw mapUnexpectedLoginError(error);
      });
  };
};
