import { z } from "zod";

// Constants for validation
const PROJECT_TYPES = ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL", "INFRASTRUCTURE", "RENOVATION", "MAINTENANCE", "CONSULTING", "OTHER"] as const;
const PROJECT_STATUSES = ["PLANNING", "IN_PROGRESS", "COMPLETED"] as const;
const MILESTONE_TYPES = ["DOWN_PAYMENT", "COMPLETION"] as const;
const MEMBER_STATUSES = ["JOINED", "PAID_DOWN", "PAID_COMPLETION", "PAID_FULL"] as const;
const SORT_FIELDS = ["title", "budget", "createdAt", "startDate", "status"] as const;
const SORT_ORDERS = ["asc", "desc"] as const;

// Enhanced project creation schema
export const createProjectSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10),
  location: z.string().min(3),
  budget: z.coerce.number().positive(),
  totalPrice: z.coerce.number().positive(),
  downPaymentPercentage: z.coerce.number().positive().max(100).default(50),
  completionPercentage: z.coerce.number().positive().max(100).default(50),
  type: z.enum(PROJECT_TYPES).default("COMMERCIAL"),
  status: z.enum(PROJECT_STATUSES).default("PLANNING"),
  startDate: z.string().datetime().optional(),
  finishDate: z.string().datetime().optional(),
  isPublic: z.boolean().default(true),
  maxParticipants: z.coerce.number().positive().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial().extend({
  deleteAssets: z.array(z.string()).optional(),
});

export const updateProjectPricingSchema = z.object({
  totalPrice: z.coerce.number().positive(),
  downPaymentPercentage: z.coerce.number().positive().max(100),
  completionPercentage: z.coerce.number().positive().max(100),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type UpdateProjectPricingInput = z.infer<typeof updateProjectPricingSchema>;

// Advanced query validation schema
export const projectQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  
  // Search & Filters
  search: z.string().optional(),                    // Search in title + description
  status: z.enum(PROJECT_STATUSES).optional(),       // Status filter
  type: z.enum(PROJECT_TYPES).optional(),            // Project type filter
  budgetMin: z.coerce.number().positive().optional(), // Min budget
  budgetMax: z.coerce.number().positive().optional(), // Max budget
  dateFrom: z.string().datetime().optional(),        // Creation date from
  dateTo: z.string().datetime().optional(),          // Creation date to
  location: z.string().optional(),                   // Location filter
  
  // Sorting
  sortBy: z.enum(SORT_FIELDS).default("createdAt"),
  sortOrder: z.enum(SORT_ORDERS).default("desc"),
  
  // Creator filter
  createdBy: z.string().optional(),                  // Filter by creator ID
});

export type ProjectQueryInput = z.infer<typeof projectQuerySchema>;

// Project member operations
export const joinProjectSchema = z.object({});

export type JoinProjectInput = z.infer<typeof joinProjectSchema>;

// Project payment operations
export const initializeProjectPaymentSchema = z.object({
  milestoneType: z.enum(MILESTONE_TYPES),
});

export type InitializeProjectPaymentInput = z.infer<typeof initializeProjectPaymentSchema>;

export const inviteUserToProjectSchema = z.object({
  userId: z.string(),
});

export type InviteUserToProjectInput = z.infer<typeof inviteUserToProjectSchema>;
