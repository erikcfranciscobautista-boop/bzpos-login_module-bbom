export const loginSchema = {
  tags: ["auth"],
  summary: "Authenticate user",
  body: {
    type: "object",
    required: ["username", "password"],
    properties: {
      username: { type: "string", minLength: 1 },
      password: { type: "string", minLength: 1 }
    }
  },
  response: {
    200: {
      type: "object",
      properties: {
        token: { type: "string" }
      },
      required: ["token"]
    }
  }
} as const;
