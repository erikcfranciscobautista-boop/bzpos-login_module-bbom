import type { FastifyReply, FastifyRequest } from "fastify";

import { type BbomLoginInput } from "../../models/dto/input/login.dto.js";
import { type BbomLoginOutput } from "../../models/dto/output/login.dto.js";
import { isBurmLoginError } from "../services/login.error.js";
import {
  buildLoginServiceErrorPayload,
  type createBbomLoginUseCase
} from "../services/login.service.js";
import { getBbomLoginAdapters } from "../services/login.contracts.js";

type LoginUseCase = ReturnType<typeof createBbomLoginUseCase>;

type BuildLoginControllerDependencies = {
  loginUseCase: LoginUseCase;
};

export const buildLoginController = ({
  loginUseCase
}: BuildLoginControllerDependencies) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    request.log.info({ fn: "LOGIN_CONTROLLER.loginController" }, "Function start");

    try {
      const input = request.body as BbomLoginInput;
      const adapters = getBbomLoginAdapters(request.server);
      const result: BbomLoginOutput = await loginUseCase(input, adapters);

      request.log.info({ fn: "LOGIN_CONTROLLER.loginController" }, "Function success");
      await reply.send(result);
    } catch (error) {
      request.log.error({ fn: "LOGIN_CONTROLLER.loginController", err: error }, "Function error");

      if (isBurmLoginError(error)) {
        const statusCode = error.statusCode === 403 || error.statusCode === 404 ? 401 : error.statusCode;
        await reply.status(statusCode).send(buildLoginServiceErrorPayload(error.code, error.details));
        return;
      }

      await reply.status(503).send({
        errorCode: "BBOM-INFRA-002",
        message: "Unexpected error while processing login",
        details: "unexpected error while processing login"
      });
    }
  };
};
