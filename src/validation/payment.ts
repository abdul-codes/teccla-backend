import { z } from "zod";

export const initializeProjectPaymentSchema = z.object({
  projectId: z.string(),
  amount: z.coerce.number().positive(),
});

export type InitializeProjectPaymentInput = z.infer<typeof initializeProjectPaymentSchema>;
