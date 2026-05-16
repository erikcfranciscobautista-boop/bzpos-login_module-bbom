import { buildLoginController } from "../controllers/login.controller.js";
import { createBbomLoginUseCase } from "../../services/login.service.js";
import { type BbomLoginPorts } from "../../services/login.ports.js";

export type BuildLoginDependenciesInput = {
  ports: BbomLoginPorts;
};

export const buildLoginDependencies = ({ ports }: BuildLoginDependenciesInput) => {
  const loginUseCase = createBbomLoginUseCase(ports);

  return buildLoginController({
    loginUseCase
  });
};
