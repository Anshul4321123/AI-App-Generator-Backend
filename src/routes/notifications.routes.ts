import { Router, Response, NextFunction } from 'express';
import { query } from '../config/db';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// GET /api/notifications - Get user's notifications
router.get('/api/notifications', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT id, message, type, read, created_at 
       FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user?.id]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications/unread/count - Get unread count
router.get('/api/notifications/unread/count', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT COUNT(*) as count 
       FROM notifications 
       WHERE user_id = $1 AND read = false`,
      [req.user?.id]
    );
    
    res.json({ success: true, data: { unreadCount: parseInt(result.rows[0].count) } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/api/notifications/:id/read', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await query(
      `UPDATE notifications 
       SET read = true 
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user?.id]
    );
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/api/notifications/read-all', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await query(
      `UPDATE notifications 
       SET read = true 
       WHERE user_id = $1 AND read = false`,
      [req.user?.id]
    );
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

export default router;