import { z } from "zod";

const emailSchema = z.string().email();
const usernameSchema = z.string().regex(/^[a-zA-Z0-9._-]{3,30}$/);
const phoneSchema = z.string().regex(/^\+?[1-9]\d{7,14}$/);

export const BbomLoginInputSchema = z.object({
  username: z
    .string()
    .trim()
    .refine((value) => {
      return (
        emailSchema.safeParse(value).success
        || usernameSchema.safeParse(value).success
        || phoneSchema.safeParse(value).success
      );
    }, "username must be a valid email, username, or phone number"),
  password: z.string().min(1, "password is required")
});

export type BbomLoginInput = z.infer<typeof BbomLoginInputSchema>;
