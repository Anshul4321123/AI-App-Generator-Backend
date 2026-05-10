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

// ✅ Get users from SAME DOMAIN only (for all users including admins)
router.get('/users/list', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const currentUserEmail = req.user?.email;
    
    if (!currentUserEmail) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    
    const domain = currentUserEmail.split('@')[1];
    
    // ✅ ALL users (including admins) only see users from their domain
    const result = await query(
      'SELECT id, email, role FROM users WHERE email LIKE $1 ORDER BY email ASC',
      [`%@${domain}`]
    );
    
    // console.log(`🔍 /users/list - User: ${currentUserEmail}, Domain: ${domain}, Found: ${result.rows.length} users`);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// ✅ Update user role with DOMAIN CHECK
router.put(
  '/users/:userId/role',
  authMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const currentUser = req.user;
      
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }
      
      // Check if current user is admin
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Only admins can change user roles' });
      }
      
      const validRoles = ['admin', 'team_lead', 'member'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      }
      
      // Get target user's email
      const targetUserResult = await query(
        'SELECT id, email, role FROM users WHERE id = $1',
        [userId]
      );
      
      if (targetUserResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      const targetUser = targetUserResult.rows[0];
      const currentUserDomain = currentUser.email.split('@')[1];
      const targetUserDomain = targetUser.email.split('@')[1];
      
      // ✅ DOMAIN CHECK: Can only change roles of users with SAME domain
      if (currentUserDomain !== targetUserDomain) {
        return res.status(403).json({ 
          success: false, 
          error: `Cannot change role of users from different domain. You can only manage users from ${currentUserDomain}` 
        });
      }
      
      // Cannot change your own role
      if (currentUser.id === userId) {
        return res.status(403).json({ success: false, error: 'Cannot change your own role' });
      }
      
      // Update role
      const result = await query(
        'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role',
        [role, userId]
      );
      
      // console.log(`✅ User ${targetUser.email} role updated to ${role} by ${currentUser.email}`);
      
      res.json({
        success: true,
        message: `User role updated to ${role}`,
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Team Management Page - Only show users from same domain
router.get(
  '/users/team',
  authMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user;
      
      if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }
      
      const currentUserDomain = currentUser.email.split('@')[1];
      
      // Only show users from same domain
      const result = await query(
        'SELECT id, email, role, created_at FROM users WHERE email LIKE $1 ORDER BY created_at DESC',
        [`%@${currentUserDomain}`]
      );
      
      // console.log(`👥 /users/team - User: ${currentUser.email}, Domain: ${currentUserDomain}, Found: ${result.rows.length} users`);
      
      res.json({ success: true, data: result.rows });
    } catch (error) {
      next(error);
    }
  }
);

export default router;