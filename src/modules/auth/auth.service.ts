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
    role: string;
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

    // ✅ Extract domain from email
    const emailDomain = input.email.toLowerCase().split('@')[1];
    
    // ✅ Check if ANY user with this domain already exists
    const domainCheckResult = await query(
      "SELECT COUNT(*) as count FROM users WHERE email LIKE $1",
      [`%@${emailDomain}`]
    );
    const domainUserCount = parseInt(domainCheckResult.rows[0].count, 10);
    
    // ✅ First user from a new domain becomes ADMIN
    // Subsequent users from same domain become MEMBER
    const userRole = domainUserCount === 0 ? 'admin' : 'member';
    
    // console.log(`📝 Registering new user: ${input.email}, Domain: ${emailDomain}, Role: ${userRole} (Existing users from this domain: ${domainUserCount})`);

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, this.SALT_ROUNDS);

    // Insert user with role
    const result = await query(
      `INSERT INTO users (email, password_hash, role) 
      VALUES ($1, $2, $3) 
      RETURNING id, email, role, created_at`,
      [input.email.toLowerCase(), hashedPassword, userRole]
    );

    const user = result.rows[0];

    // Generate JWT token with role
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
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

    // Find user with role
    const result = await query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
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

    // Generate JWT token with role
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  // Generate token with role included
  private generateToken(userId: string, email: string, role: string): string {
    return jwt.sign(
      { id: userId, email: email, role: role },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  // Update user role (admin only)
  async updateUserRole(userId: string, newRole: string, currentUserRole: string): Promise<void> {
    // Only admin can change roles
    if (currentUserRole !== 'admin') {
      throw new AppError('Only admins can change user roles', 403);
    }
    
    const validRoles = ['admin', 'team_lead', 'member'];
    if (!validRoles.includes(newRole)) {
      throw new AppError(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
    }
    
    const result = await query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id',
      [newRole, userId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }
    
    // console.log(`✅ User ${userId} role updated to ${newRole}`);
  }
}