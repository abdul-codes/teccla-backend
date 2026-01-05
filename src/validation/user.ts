import { z } from 'zod';
import { UserRole } from '../../prisma/generated/prisma/client';

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional().nullable(),
  profilePicture: z.string()
    .refine((val) => {
      if (!val) return true; // Allow empty/null
      const isUrl = z.string().url().safeParse(val).success;
      const isDataUri = /^data:image\/(?:png|jpg|jpeg|gif|webp);base64,/.test(val);
      return isUrl || isDataUri;
    }, "Must be a valid URL or image Data URI")
    .nullable()
    .optional(),
  companyName: z.string().max(200).optional(),
  companyRole: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  // Only admins can set these (will be checked in controller)
  role: z.enum([UserRole.ADMIN, UserRole.USER]).optional(),
  emailVerified: z.coerce.date().optional(),
});

export const searchUsersSchema = z.object({
  query: z.string().min(1).max(100),
});
