import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import type { ZodTypeAny } from "zod";

type ValidationTargets = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  querystring?: ZodTypeAny;
  headers?: ZodTypeAny;
};

const validateOrReply = (
  schema: ZodTypeAny,
  payload: unknown,
  segment: keyof ValidationTargets,
  request: FastifyRequest,
  reply: FastifyReply
): boolean => {
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    void reply.status(400).send({
      errorCode: "BBOM-INPUT-001",
      message: "Invalid request format",
      details: {
        segment,
        issues: parsed.error.issues,
        route: request.url
      }
    });

    return false;
  }

  const mutableRequest = request as unknown as Record<string, unknown>;
  mutableRequest[segment] = parsed.data;

  return true;
};

export const createZodValidationPreHandler = (
  targets: ValidationTargets
): preHandlerHookHandler => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (targets.body && !validateOrReply(targets.body, request.body, "body", request, reply)) {
      return reply;
    }

    if (targets.params && !validateOrReply(targets.params, request.params, "params", request, reply)) {
      return reply;
    }

    if (
      targets.querystring
      && !validateOrReply(targets.querystring, request.query, "querystring", request, reply)
    ) {
      return reply;
    }

    if (targets.headers && !validateOrReply(targets.headers, request.headers, "headers", request, reply)) {
      return reply;
    }
  };
};
