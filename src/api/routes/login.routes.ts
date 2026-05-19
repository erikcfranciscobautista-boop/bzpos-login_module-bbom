import type { FastifyPluginAsync } from "fastify";

import { loginSwaggerSchema } from "../../models/dto/swagger/login.swagger.js";
import { BbomLoginInputSchema, type BbomLoginInput } from "../../models/dto/input/login.dto.js";
import { createZodValidationPreHandler } from "../middlewares/zodValidationPreHandler.js";
import { buildLoginDependencies } from "./login.dependencies.js";

export const loginRoutes: FastifyPluginAsync = async (app) => {
  if (!app.hasDecorator("loginModuleRoutesBbom")) {
    throw new Error("Missing fastify decorator: loginModuleRoutesBbom");
  }

  const loginController = buildLoginDependencies();

  app.post<{
    Body: BbomLoginInput;
  }>(
    "/login",
    {
      schema: loginSwaggerSchema,
      preHandler: [createZodValidationPreHandler({
        body: BbomLoginInputSchema,
        bodyRequiredFields: ["username", "password"]
      })]
    },
    loginController
  );
};
