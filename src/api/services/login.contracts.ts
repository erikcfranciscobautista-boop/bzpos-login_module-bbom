import type { FastifyInstance } from "fastify";

import type { BbomLoginInput } from "../../models/dto/input/login.dto.js";
import type { BbomLoginOutput } from "../../models/dto/output/login.dto.js";

export type BurmUserIdentityDto = {
  burm_user_id: string;
  bcpm_department_id: string;
  bcpm_role_id: string;
  bcpm_status_id: string;
};

export type BurmClaimsDto = {
  burm_user_id: string;
  bcpm_department_id: string;
  bcpm_role_id: string;
  claims: string[];
};

export type BurmCredentialAttemptsDto = {
  burm_user_id: string;
  burm_credential_attempts: number;
};

export type BbomLoginAdapters = {
  getBurmIdentity: (input: BbomLoginInput) => Promise<BurmUserIdentityDto>;
  getBcpmStatusById: (statusId: string) => Promise<{ bcpm_status_key: string }>;
  getBacmRoleAuthoritiesByRoleId: (roleId: string) => Promise<string[]>;
  patchBurmCredentialAttempts: (username: string) => Promise<BurmCredentialAttemptsDto>;
  patchBurmProfileStatus: (userId: string, statusKey: string) => Promise<void>;
  postBurmLoginToken: (claims: BurmClaimsDto) => Promise<{ token?: unknown } | unknown>;
};

export type BbomLoginLogger = {
  info: (context: Record<string, unknown>, message: string) => void;
  error: (context: Record<string, unknown>, message: string) => void;
};

export type BbomLoginUseCase = (
  input: BbomLoginInput,
  adapters: BbomLoginAdapters,
  logger: BbomLoginLogger
) => Promise<BbomLoginOutput>;

declare module "fastify" {
  interface FastifyInstance {
    bbomLoginAdapters: BbomLoginAdapters;
  }
}

export const getBbomLoginAdapters = (app: FastifyInstance): BbomLoginAdapters => {
  return app.bbomLoginAdapters;
};
