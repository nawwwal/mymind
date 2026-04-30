import { z } from "zod";

const rateLimitSchema = z.record(z.string(), z.unknown()).or(
  z.object({ raw: z.record(z.string(), z.unknown()).optional() }).catchall(z.unknown())
);

export const cliEnvelopeOutputSchema = z
  .object({
    v: z.literal(1),
    kind: z.string(),
    data: z.unknown(),
    rateLimit: rateLimitSchema.optional(),
    warnings: z.array(z.string()).optional()
  })
  .strict();

export const cliCompactOutputSchema = z.unknown();

export const CLI_OUTPUT_SCHEMAS = {
  envelope: cliEnvelopeOutputSchema,
  compact: cliCompactOutputSchema
} as const;

