import { z } from 'zod';
// Project creation validation schema
export const createProjectSchema = z.object({
    title: z.string().min(3).max(100),
    description: z.string().min(10),
    location: z.string().min(3),
    budget: z.number().positive(),
    type: z.string().min(2),
    files: z.array(z.string()).optional().default([]),
    images: z.array(z.string()).optional().default([]),
    status: z.enum(['planning', 'inprogress', 'completed']).default('planning'),
    startDate: z.string().datetime().optional(),
    finishDate: z.string().datetime().optional(),
  });
  
  export type CreateProjectInput = z.infer<typeof createProjectSchema>;