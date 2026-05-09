import { Router, Request, Response, NextFunction } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import { RecordsController } from '../modules/records/records.controller';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { query } from '../config/db';
import importRoutes from './import.routes';
import notificationsRoutes from './notifications.routes';
const router = Router();
const recordsController = new RecordsController();

// ============================================
// PUBLIC ROUTES (no auth required)
// ============================================
router.use('/auth', authRoutes);
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// APPS ROUTES (MUST come BEFORE dynamic /api/:entity routes!)
// ============================================

// GET /api/apps - Get all apps for current user
router.get('/api/apps', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('📡 [APPS] Fetching apps for user:', req.user?.id);
    
    const result = await query(
      'SELECT id, name, config, created_by, created_at FROM apps WHERE created_by = $1 ORDER BY created_at DESC',
      [req.user?.id]
    );
    
    console.log('✅ [APPS] Found:', result.rows.length);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ [APPS] Error:', error);
    next(error);
  }
});

// GET /api/apps/:id - Get specific app
router.get('/api/apps/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      'SELECT id, name, config, created_by, created_at FROM apps WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user?.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'App not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// POST /api/apps - Create new app
router.post('/api/apps', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, config } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'App name is required' });
    }
    
    const result = await query(
      'INSERT INTO apps (name, config, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name, config || { pages: [] }, req.user?.id]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// PUT /api/apps/:id - Update app
router.put('/api/apps/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, config } = req.body;
    
    const result = await query(
      'UPDATE apps SET name = COALESCE($1, name), config = COALESCE($2, config) WHERE id = $3 AND created_by = $4 RETURNING *',
      [name, config, req.params.id, req.user?.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'App not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/apps/:id - Delete app
router.delete('/api/apps/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      'DELETE FROM apps WHERE id = $1 AND created_by = $2 RETURNING id',
      [req.params.id, req.user?.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'App not found' });
    }
    
    res.json({ success: true, message: 'App deleted successfully' });
  } catch (error) {
    next(error);
  }
});

router.use(importRoutes);
router.use(notificationsRoutes);
// ============================================
// DYNAMIC CRUD ROUTES (MUST come LAST!)
// ============================================

// IMPORTANT: These routes will match ANY /api/:entity
// So they must be defined AFTER the specific /api/apps routes

router.post('/api/:entity', authMiddleware, recordsController.createRecord.bind(recordsController));
router.get('/api/:entity', authMiddleware, recordsController.getRecords.bind(recordsController));
router.get('/api/:entity/:id', authMiddleware, recordsController.getRecordById.bind(recordsController));
router.put('/api/:entity/:id', authMiddleware, recordsController.updateRecord.bind(recordsController));
router.delete('/api/:entity/:id', authMiddleware, recordsController.deleteRecord.bind(recordsController));

// Utility route: get all entity types for current user
router.get('/api/entities', authMiddleware, recordsController.getUserEntities.bind(recordsController));

export default router;