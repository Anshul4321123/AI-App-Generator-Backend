import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import { RecordsController } from '../modules/records/records.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const recordsController = new RecordsController();

// Auth routes (public)
router.use('/auth', authRoutes);

// Dynamic CRUD routes (protected)
router.post('/api/:entity', authMiddleware, recordsController.createRecord.bind(recordsController));
router.get('/api/:entity', authMiddleware, recordsController.getRecords.bind(recordsController));
router.get('/api/:entity/:id', authMiddleware, recordsController.getRecordById.bind(recordsController));
router.put('/api/:entity/:id', authMiddleware, recordsController.updateRecord.bind(recordsController));
router.delete('/api/:entity/:id', authMiddleware, recordsController.deleteRecord.bind(recordsController));

// Utility route: get all entity types for current user
router.get('/api/entities', authMiddleware, recordsController.getUserEntities.bind(recordsController));

// Health check (public)
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;