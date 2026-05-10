import { Router, Response, NextFunction } from 'express';
import { query } from '../config/db';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// GET /api/teams - Get user's teams
router.get('/api/teams', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT t.*, 
        (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
       FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = $1
       ORDER BY t.created_at DESC`,
      [req.user?.id]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// POST /api/teams - Create a new team
router.post('/api/teams', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Team name is required' });
    }
    
    // Create team
    const teamResult = await query(
      `INSERT INTO teams (name, description, created_by) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [name, description || '', req.user?.id]
    );
    
    // Add creator as admin member
    await query(
      `INSERT INTO team_members (team_id, user_id, role) 
       VALUES ($1, $2, $3)`,
      [teamResult.rows[0].id, req.user?.id, 'admin']
    );
    
    res.status(201).json({ success: true, data: teamResult.rows[0] });
  } catch (error) {
    next(error);
  }
});

// GET /api/teams/:id/members - Get team members
router.get('/api/teams/:id/members', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT tm.*, u.email, u.role as user_role
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1`,
      [req.params.id]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// POST /api/teams/:id/members - Add member to team
router.post('/api/teams/:id/members', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, role } = req.body;
    
    // Find user by email
    const userResult = await query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Add to team
    await query(
      `INSERT INTO team_members (team_id, user_id, role) 
       VALUES ($1, $2, $3)
       ON CONFLICT (team_id, user_id) DO NOTHING`,
      [req.params.id, userResult.rows[0].id, role || 'member']
    );
    
    res.json({ success: true, message: 'Member added successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;