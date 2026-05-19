import { buildLoginController } from "../controllers/login.controller.js";
import { createBbomLoginUseCase } from "../services/login.service.js";

export const buildLoginDependencies = () => {
  const loginUseCase = createBbomLoginUseCase();

  return buildLoginController({
    loginUseCase
  });
};
