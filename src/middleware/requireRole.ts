import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Required role: ' + allowedRoles.join(' or ')
      });
    }

    next();
  };
};

// Check if user is admin
export const requireAdmin = requireRole(['admin']);

// Check if user is admin or team lead
export const requireAdminOrLead = requireRole(['admin', 'team_lead']);