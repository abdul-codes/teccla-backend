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
    .refine((val) => {
      if (!val) return true; // Allow empty/null
      const isUrl = z.string().url().safeParse(val).success;
      const isDataUri = /^data:image\/(?:png|jpg|jpeg|gif|webp);base64,/.test(val);
      return isUrl || isDataUri;
    }, "Must be a valid URL or image Data URI")
    .nullable()
    .optional(),
});
  
//   export type UpdateProfileSchema = z.infer<typeof profileUpdateSchema>;