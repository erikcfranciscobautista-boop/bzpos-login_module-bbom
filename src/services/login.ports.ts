import type { BbomLoginInput } from "../models/dto/input/login.dto.js";
import type { BbomLoginOutput } from "../models/dto/output/login.dto.js";

export type BurmUserIdentifierOutput = {
  burm_user_id: string;
  bcpm_department_id: string;
  bcpm_role_id: string;
  bcpm_status_id: string;
};

export type EnrichedClaims = {
  burm_user_id: string;
  bcpm_department_id: string;
  bcpm_role_id: string;
  claims: string[];
};

export type BurmIncrementAttemptsOutput = {
  burm_user_id: string;
  burm_credential_attempts: number;
};

export type BurmLoginTokenOutput = {
  token: string;
};

export type BbomLoginPorts = {
  getBurmIdentity: (input: BbomLoginInput) => Promise<BurmUserIdentifierOutput>;
  getBcpmStatusById: (statusId: string) => Promise<{ bcpm_status_key: string }>;
  getBacmRoleAuthoritiesByRoleId: (roleId: string) => Promise<string[]>;
  patchBurmCredentialAttempts: (username: string) => Promise<BurmIncrementAttemptsOutput>;
  patchBurmProfileStatus: (userId: string, statusKey: string) => Promise<void>;
  postBurmLoginToken: (claims: EnrichedClaims) => Promise<BurmLoginTokenOutput | unknown>;
};

export type BbomLoginUseCase = (input: BbomLoginInput) => Promise<BbomLoginOutput>;
