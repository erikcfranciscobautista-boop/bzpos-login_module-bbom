import { BbomLoginInputSchema, type BbomLoginInput } from "../../models/dto/input/login.dto.js";
import { BbomLoginOutputSchema, type BbomLoginOutput } from "../../models/dto/output/login.dto.js";
import {
  type BbomLoginAdapters,
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
  return (input: BbomLoginInput, adapters: BbomLoginAdapters): Promise<BbomLoginOutput> => {
    const parsedInput = BbomLoginInputSchema.parse(input);

    return resolveIdentityRepository(adapters, parsedInput)
      .then((identity) => resolveTokenClaimsRepository(adapters, identity))
      .then((tokenClaims) => resolveTokenRepository(adapters, tokenClaims))
      .then((token) => BbomLoginOutputSchema.parse({ token }))
      .catch((error: unknown) => {
        throw mapUnexpectedLoginError(error);
      });
  };
};
