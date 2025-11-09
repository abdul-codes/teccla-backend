import { z } from "zod";
// Project creation validation schema
export const createProjectSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10),
  location: z.string().min(3),
  budget: z.coerce.number().positive(),
  type: z.string().min(2),
  status: z.enum(["PLANNING", "IN_PROGRESS", "COMPLETED"]).default("PLANNING"),
  startDate: z.string().datetime().optional(),
  finishDate: z.string().datetime().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
