import { Router, Response, NextFunction } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/requireRole';
import { query } from '../../config/db';
import { AppError } from '../../middleware/error.middleware';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));

// Protected routes (require authentication)
router.get('/me', authMiddleware, authController.me.bind(authController));

// ✅ Get users from same domain for assignment dropdown
router.get('/users/list', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const currentUserEmail = req.user?.email;
    const currentUserRole = req.user?.role;
    
    if (!currentUserEmail) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    
    // Extract domain from current user's email
    const domain = currentUserEmail.split('@')[1];
    
    let queryText = 'SELECT id, email, role FROM users';
    let params: any[] = [];
    
    // Admin sees all users, others see only same domain
    if (currentUserRole === 'admin') {
      queryText += ' ORDER BY email ASC';
    } else {
      queryText += ' WHERE email LIKE $1 ORDER BY email ASC';
      params.push(`%@${domain}`);
    }
    
    const result = await query(queryText, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Admin only: Update user role
router.put(
  '/users/:userId/role',
  authMiddleware,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const currentUserRole = req.user?.role || 'member';

      const validRoles = ['admin', 'team_lead', 'member'];
      if (!validRoles.includes(role)) {
        throw new AppError(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
      }

      if (currentUserRole !== 'admin') {
        throw new AppError('Only admins can change user roles', 403);
      }

      const result = await query(
        'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role',
        [role, userId]
      );

      if (result.rows.length === 0) {
        throw new AppError('User not found', 404);
      }

      res.json({
        success: true,
        message: 'User role updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin only: Get all users (full list - no domain filter)
router.get(
  '/users',
  authMiddleware,
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        'SELECT id, email, role, created_at FROM users ORDER BY created_at DESC'
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      next(error);
    }
  }
);

export default router;