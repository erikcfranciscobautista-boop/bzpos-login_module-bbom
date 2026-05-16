import { z } from "zod";

export const BbomLoginOutputSchema = z.object({
  token: z.string().min(1)
});

export type BbomLoginOutput = z.infer<typeof BbomLoginOutputSchema>;
