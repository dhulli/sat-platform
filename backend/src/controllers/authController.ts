import { Request, Response } from 'express';
import { UserModel, User } from '../models/User';
import { JWTUtil, TokenPayload } from '../utils/jwt';

export class AuthController {
  // User registration
  static async register(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Hash password and create user
      const passwordHash = await UserModel.hashPassword(password);
      const user = await UserModel.create({
        email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        subscription_type: 'free'
      });

      // Generate JWT token
      const tokenPayload: TokenPayload = {
        userId: user.id!,
        email: user.email,
        subscriptionType: user.subscription_type
      };
      
      const token = JWTUtil.generateToken(tokenPayload);

      // Return user data (excluding password)
      const userResponse = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionType: user.subscription_type
      };

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: userResponse,
          token
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during registration'
      });
    }
  }

  // User login
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find user
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Verify password
      const isValidPassword = await UserModel.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate JWT token
      const tokenPayload: TokenPayload = {
        userId: user.id!,
        email: user.email,
        subscriptionType: user.subscription_type
      };
      
      const token = JWTUtil.generateToken(tokenPayload);

      // Return user data (excluding password)
      const userResponse = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionType: user.subscription_type
      };

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse,
          token
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      });
    }
  }

  // Get current user profile
  static async getProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const userResponse = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscriptionType: user.subscription_type,
        createdAt: user.created_at
      };

      res.json({
        success: true,
        data: {
          user: userResponse
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update user profile
  static async updateProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { firstName, lastName } = req.body;
      
      // Update user in database
      const connection = await (await import('../config/database')).default.getConnection();
      await connection.execute(
        'UPDATE users SET first_name = ?, last_name = ? WHERE id = ?',
        [firstName, lastName, req.user.userId]
      );
      connection.release();

      // Get updated user
      const user = await UserModel.findById(req.user.userId);

      const userResponse = {
        id: user!.id,
        email: user!.email,
        firstName: user!.first_name,
        lastName: user!.last_name,
        subscriptionType: user!.subscription_type
      };

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: userResponse
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}