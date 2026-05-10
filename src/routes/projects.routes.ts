import { Router, Response, NextFunction } from 'express';
import { query } from '../config/db';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/rbac.middleware';

const router = Router();

// GET /api/projects - Get all projects (filtered by user access)
router.get('/api/projects', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    let queryText = `
      SELECT id, data, created_at 
      FROM records 
      WHERE entity_name = 'projects'
    `;
    
    // If not admin, only show active projects or projects user has access to
    if (userRole !== 'admin') {
      queryText += ` AND (data->>'status' = 'active' OR data->>'status' IS NULL)`;
    }
    
    queryText += ` ORDER BY created_at DESC`;
    
    const result = await query(queryText);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects - Create project (admin only)
router.post('/api/projects', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { name, description, status } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Project name is required' });
    }
    
    const projectData = {
      name,
      description: description || '',
      status: status || 'active',
      created_by: userId,
      created_at: new Date().toISOString()
    };
    
    const result = await query(
      `INSERT INTO records (entity_name, data, user_id) 
       VALUES ('projects', $1, $2) 
       RETURNING id, data`,
      [projectData, userId]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;