/**
 * YourCoach JWT Token Generation Utility
 * 
 * Generates JWT tokens signed with RS256 for YourCoach authentication.
 * Note: This requires the 'jose' library (add to package.json)
 */

import { SignJWT, importPKCS8 } from 'jose';
import { JWT_CONFIG } from '../config/yourcoach';

/**
 * Convert string to UTF-8 encoded bytes
 */
function getUtf8Bytes(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Generate a JWT token for YourCoach authentication
 * 
 * @param userId - The user ID from your system
 * @param expirationTime - Token expiration time (e.g., '1m', '1h')
 * @returns Promise<string> - The signed JWT token
 */
export async function generateYourCoachToken(
  userId: string | number,
  expirationTime: string = '1m'
): Promise<string> {
  try {
    if (!JWT_CONFIG.privateKey) {
      throw new Error('Private key not configured. Check VITE_YOURCOACH_PRIVATE_KEY environment variable.');
    }

    // Import the private key — replace escaped \n sequences with real newlines
    // (Vite stores env var newlines as literal \n characters)
    const privateKey = await importPKCS8(
      JWT_CONFIG.privateKey.replace(/\\n/g, '\n'),
      JWT_CONFIG.algorithm
    );

    // Create and sign JWT
    const jwt = await new SignJWT({
      user_id: String(userId),
    })
      .setProtectedHeader({ alg: JWT_CONFIG.algorithm })
      .setIssuedAt()
      .setIssuer(JWT_CONFIG.issuer)
      .setExpirationTime(expirationTime)
      .sign(privateKey);

    return jwt;
  } catch (error) {
    console.error('Error generating YourCoach token:', error);
    throw error;
  }
}

/**
 * Verify that a JWT token is valid (for testing purposes)
 * 
 * @param token - The JWT token to verify
 * @returns Promise<boolean> - True if valid
 */
export async function isValidYourCoachToken(token: string): Promise<boolean> {
  try {
    // This is a basic check. In production, you might want to verify the signature too.
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Decode the payload (without verification)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );

    // Check if token has expired
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return false;
    }

    return !!payload.user_id;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
}

/**
 * Decode a JWT token payload (without verification)
 * Use only for debugging purposes
 */
export function decodeYourCoachTokenPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Note: This is base64url encoded
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}
