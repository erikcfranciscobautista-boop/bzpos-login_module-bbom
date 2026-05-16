import type { FastifyPluginAsync } from "fastify";

import { BbomLoginInputSchema, type BbomLoginInput } from "../../models/dto/input/login.dto.js";
import { type BbomLoginPorts } from "../../services/login.ports.js";
import { createZodValidationPreHandler } from "../middlewares/zodValidationPreHandler.js";
import { loginSchema } from "./login.swagger.js";
import { buildLoginDependencies } from "./login.dependencies.js";

export type BuildLoginRoutesInput = {
  ports: BbomLoginPorts;
};

export const buildLoginRoutes = ({ ports }: BuildLoginRoutesInput): FastifyPluginAsync => {
  return async (app) => {
    const loginController = buildLoginDependencies({ ports });

    app.post<{
      Body: BbomLoginInput;
    }>(
      "/login",
      {
        schema: loginSchema,
        preHandler: [createZodValidationPreHandler({ body: BbomLoginInputSchema })]
      },
      loginController
    );
  };
};
