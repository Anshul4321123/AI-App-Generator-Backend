import { Response, NextFunction } from 'express';
import { RecordsService } from './records.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import { validateEntityName, validateUUID } from '../../engine/validator';
import { AppError } from '../../middleware/error.middleware';

const recordsService = new RecordsService();

export class RecordsController {
  /**
   * POST /api/:entity
   * Create a new record
   */
  async createRecord(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { entity } = req.params;
      const userId = req.user?.id;
      const { appId, ...data } = req.body;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Cast entity to string (Express params can be string or string[])
      const entityName = entity as string;

      // Validate entity name
      const entityValidation = validateEntityName(entityName);
      if (!entityValidation.isValid) {
        throw new AppError(entityValidation.error || 'Invalid entity name', 400);
      }

      const record = await recordsService.createRecord(
        entityName,
        data,
        userId,
        appId
      );

      res.status(201).json({
        success: true,
        message: 'Record created successfully',
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/:entity
   * Get all records for an entity (user-scoped)
   */
  async getRecords(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { entity } = req.params;
      const userId = req.user?.id;
      const { limit, offset, ...filters } = req.query;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Cast entity to string
      const entityName = entity as string;

      // Validate entity name
      const entityValidation = validateEntityName(entityName);
      if (!entityValidation.isValid) {
        throw new AppError(entityValidation.error || 'Invalid entity name', 400);
      }

      const records = await recordsService.getRecords(entityName, userId, filters);

      res.status(200).json({
        success: true,
        count: records.length,
        data: records,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/:entity/:id
   * Get single record by ID
   */
  async getRecordById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { entity, id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Cast to strings
      const entityName = entity as string;
      const recordId = id as string;

      // Validate entity name
      const entityValidation = validateEntityName(entityName);
      if (!entityValidation.isValid) {
        throw new AppError(entityValidation.error || 'Invalid entity name', 400);
      }

      // Validate UUID
      const uuidValidation = validateUUID(recordId);
      if (!uuidValidation.isValid) {
        throw new AppError(uuidValidation.error || 'Invalid ID format', 400);
      }

      const record = await recordsService.getRecordById(recordId, entityName, userId);

      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/:entity/:id
   * Update a record
   */
  async updateRecord(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { entity, id } = req.params;
      const userId = req.user?.id;
      const updateData = req.body;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Cast to strings
      const entityName = entity as string;
      const recordId = id as string;

      // Validate entity name
      const entityValidation = validateEntityName(entityName);
      if (!entityValidation.isValid) {
        throw new AppError(entityValidation.error || 'Invalid entity name', 400);
      }

      // Validate UUID
      const uuidValidation = validateUUID(recordId);
      if (!uuidValidation.isValid) {
        throw new AppError(uuidValidation.error || 'Invalid ID format', 400);
      }

      const record = await recordsService.updateRecord(
        recordId,
        entityName,
        userId,
        updateData
      );

      res.status(200).json({
        success: true,
        message: 'Record updated successfully',
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/:entity/:id
   * Delete a record
   */
  async deleteRecord(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { entity, id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Cast to strings
      const entityName = entity as string;
      const recordId = id as string;

      // Validate entity name
      const entityValidation = validateEntityName(entityName);
      if (!entityValidation.isValid) {
        throw new AppError(entityValidation.error || 'Invalid entity name', 400);
      }

      // Validate UUID
      const uuidValidation = validateUUID(recordId);
      if (!uuidValidation.isValid) {
        throw new AppError(uuidValidation.error || 'Invalid ID format', 400);
      }

      await recordsService.deleteRecord(recordId, entityName, userId);

      res.status(200).json({
        success: true,
        message: 'Record deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/entities
   * Get all entity types used by the user
   */
  async getUserEntities(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const entities = await recordsService.getUserEntities(userId);

      res.status(200).json({
        success: true,
        data: entities,
      });
    } catch (error) {
      next(error);
    }
  }
}