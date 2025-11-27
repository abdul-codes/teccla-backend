import {z} from "zod"

export const UserProfileUpdateSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phoneNumber: z.string().optional(),
    companyName: z.string().optional(),
    companyRole: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(), 
    state: z.string().optional(),
    country: z.string().optional(),
    profilePicture: z.string()
    .refine(
      (val) => !val || val.startsWith('data:image/'), 
      "Profile picture must be a valid data URI for an image"
    )
    .optional(),
});
  
//   export type UpdateProfileSchema = z.infer<typeof profileUpdateSchema>;