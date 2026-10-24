import { z } from 'zod';
import { passwordSchema } from '../schemas/passwordSchema';

export type PasswordFormData = z.infer<typeof passwordSchema>;