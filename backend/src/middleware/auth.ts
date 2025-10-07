import { Request, Response, NextFunction } from 'express';
import { JWTUtil, TokenPayload } from '../utils/jwt';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = JWTUtil.extractToken(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = JWTUtil.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

// Optional authentication (for routes that work with or without auth)
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = JWTUtil.extractToken(req.headers.authorization);
    if (token) {
      const decoded = JWTUtil.verifyToken(token);
      req.user = decoded;
    }
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};