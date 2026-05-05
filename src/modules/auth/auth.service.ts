import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../config/db';
import { env } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { validateEmail, validatePassword } from '../../engine/validator';

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

export class AuthService {
  private readonly SALT_ROUNDS = 10;

  async register(input: RegisterInput): Promise<AuthResponse> {
    // Validate input
    const emailValidation = validateEmail(input.email);
    if (!emailValidation.isValid) {
      throw new AppError(emailValidation.error || 'Invalid email', 400);
    }

    const passwordValidation = validatePassword(input.password);
    if (!passwordValidation.isValid) {
      throw new AppError(passwordValidation.error || 'Invalid password', 400);
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [input.email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('User already exists with this email', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, this.SALT_ROUNDS);

    // Insert user
    const result = await query(
      `INSERT INTO users (email, password_hash) 
       VALUES ($1, $2) 
       RETURNING id, email, created_at`,
      [input.email.toLowerCase(), hashedPassword]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = this.generateToken(user.id, user.email);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    // Validate input
    const emailValidation = validateEmail(input.email);
    if (!emailValidation.isValid) {
      throw new AppError('Invalid email format', 400);
    }

    if (!input.password || typeof input.password !== 'string') {
      throw new AppError('Password is required', 400);
    }

    // Find user
    const result = await query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [input.email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid email or password', 401);
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(input.password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate JWT token
    const token = this.generateToken(user.id, user.email);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  private generateToken(userId: string, email: string): string {
    return jwt.sign(
      { id: userId, email: email },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }
}