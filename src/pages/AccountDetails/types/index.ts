import { z } from 'zod';
import { accountSchema } from '../schemas/accountSchema';

export type AccountFormData = z.infer<typeof accountSchema>;