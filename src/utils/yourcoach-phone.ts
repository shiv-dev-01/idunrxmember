/**
 * Normalize a phone number to E.164 format required by YourCoach (+[country][number]).
 * Assumes US (+1) if no country code is present.
 */
export function toE164(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (phone.startsWith('+')) return phone;
  return null;
}
