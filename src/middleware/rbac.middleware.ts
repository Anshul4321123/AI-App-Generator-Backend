import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { query } from '../config/db';

// Check if user has admin role
export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const result = await query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );
    
    const userRole = result.rows[0]?.role;
    
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Check if user has access to a specific team
export const requireTeamAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const teamId = req.params.teamId || req.body.teamId;
    
    if (!teamId) {
      return next(); // No team restriction
    }
    
    const result = await query(
      `SELECT * FROM team_members 
       WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this team' });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Get user's role in a team
export const getTeamRole = async (userId: string, teamId: string): Promise<string | null> => {
  const result = await query(
    `SELECT role FROM team_members 
     WHERE team_id = $1 AND user_id = $2`,
    [teamId, userId]
  );
  
  return result.rows[0]?.role || null;
};