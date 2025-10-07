import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-for-testing-only';

// Only throw error in production
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

export interface TokenPayload {
  userId: number;
  email: string;
  subscriptionType: string;
}

export class JWTUtil {
  // Generate JWT token
  static generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '7d', // Token expires in 7 days
      issuer: 'sat-platform',
      subject: payload.userId.toString()
    });
  }

  // Verify JWT token
  static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Extract token from Authorization header
  static extractToken(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7); // Remove "Bearer " prefix
  }
}