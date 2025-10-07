import pool from '../config/database';
import bcrypt from 'bcryptjs';

export interface User {
  id?: number;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  subscription_type: 'free' | 'premium';
  created_at?: Date;
  updated_at?: Date;
}

export class UserModel {
  static async create(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const { email, password_hash, first_name, last_name, subscription_type } = userData;
    
    const [result] = await pool.execute(
      `INSERT INTO users (email, password_hash, first_name, last_name, subscription_type) 
       VALUES (?, ?, ?, ?, ?)`,
      [email, password_hash, first_name, last_name, subscription_type]
    );
    
    const userId = (result as any).insertId;
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('Failed to create user');
    }
    return user;
  }

  static async findById(id: number): Promise<User | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    const users = rows as User[];
    return users.length > 0 ? users[0] : null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    const users = rows as User[];
    return users.length > 0 ? users[0] : null;
  }

  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }
}