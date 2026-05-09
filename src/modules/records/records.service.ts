import { query } from '../../config/db';
import { AppError } from '../../middleware/error.middleware';
import { validateRequestBody, sanitizeData } from '../../engine/validator';

// Renamed interface to avoid conflict with TypeScript's Record type
export interface DataRecord {
  id: string;
  app_id: string | null;
  entity_name: string;
  data: any;
  user_id: string;
  created_at: Date;
}

export class RecordsService {
  /**
   * Helper: Create notification for user
   */
  private async createNotification(userId: string, message: string, type: string = 'info') {
    try {
      await query(
        `INSERT INTO notifications (user_id, message, type, read) 
         VALUES ($1, $2, $3, $4)`,
        [userId, message, type, false]
      );
    } catch (error) {
      console.error('Failed to create notification:', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Create a new record
   */
  async createRecord(
    entityName: string,
    data: any,
    userId: string,
    appId?: string
  ): Promise<DataRecord> {
    // Validate request body
    const validation = validateRequestBody(data);
    if (!validation.isValid) {
      throw new AppError(validation.error || 'Invalid request body', 400);
    }

    // Sanitize data (remove sensitive fields)
    const sanitizedData = sanitizeData(data);

    // Insert record
    const result = await query(
      `INSERT INTO records (entity_name, data, user_id, app_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, entity_name, data, user_id, app_id, created_at`,
      [entityName, sanitizedData, userId, appId || null]
    );

    // Create notification
    await this.createNotification(userId, `Created new ${entityName} record`, 'success');

    return result.rows[0];
  }

  /**
   * Get all records for an entity (user-scoped)
   */
  async getRecords(
    entityName: string,
    userId: string,
    filters?: any
  ): Promise<DataRecord[]> {
    let queryText = `
      SELECT id, entity_name, data, user_id, app_id, created_at 
      FROM records 
      WHERE entity_name = $1 AND user_id = $2
    `;
    const queryParams: any[] = [entityName, userId];

    // Add additional filters if provided (basic implementation)
    if (filters && Object.keys(filters).length > 0) {
      let filterIndex = 3;
      for (const [key, value] of Object.entries(filters)) {
        queryText += ` AND data->>$3 = $${filterIndex}`;
        queryParams.push(key, value);
        filterIndex++;
        break; // Only apply first filter for now
      }
    }

    queryText += ` ORDER BY created_at DESC`;

    const result = await query(queryText, queryParams);
    return result.rows;
  }

  /**
   * Get single record by ID (with user verification)
   */
  async getRecordById(
    id: string,
    entityName: string,
    userId: string
  ): Promise<DataRecord> {
    const result = await query(
      `SELECT id, entity_name, data, user_id, app_id, created_at 
       FROM records 
       WHERE id = $1 AND entity_name = $2 AND user_id = $3`,
      [id, entityName, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Record not found', 404);
    }

    return result.rows[0];
  }

  /**
   * Update a record (merges with existing data)
   */
  async updateRecord(
    id: string,
    entityName: string,
    userId: string,
    newData: any
  ): Promise<DataRecord> {
    // Validate request body
    const validation = validateRequestBody(newData);
    if (!validation.isValid) {
      throw new AppError(validation.error || 'Invalid request body', 400);
    }

    // Check if record exists and belongs to user
    const existing = await this.getRecordById(id, entityName, userId);

    // Merge existing data with new data
    const mergedData = {
      ...existing.data,
      ...sanitizeData(newData),
    };

    // Update record
    const result = await query(
      `UPDATE records 
       SET data = $1 
       WHERE id = $2 AND entity_name = $3 AND user_id = $4 
       RETURNING id, entity_name, data, user_id, app_id, created_at`,
      [mergedData, id, entityName, userId]
    );

    // Create notification
    await this.createNotification(userId, `Updated ${entityName} record`, 'info');

    return result.rows[0];
  }

  /**
   * Delete a record
   */
  async deleteRecord(
    id: string,
    entityName: string,
    userId: string
  ): Promise<void> {
    // Check if record exists and belongs to user
    await this.getRecordById(id, entityName, userId);

    // Delete record
    await query(
      `DELETE FROM records 
       WHERE id = $1 AND entity_name = $2 AND user_id = $3`,
      [id, entityName, userId]
    );

    // Create notification
    await this.createNotification(userId, `Deleted ${entityName} record`, 'warning');
  }

  /**
   * Get all unique entity names for a user
   */
  async getUserEntities(userId: string): Promise<string[]> {
    const result = await query(
      `SELECT DISTINCT entity_name 
       FROM records 
       WHERE user_id = $1 
       ORDER BY entity_name`,
      [userId]
    );
    return result.rows.map(row => row.entity_name);
  }

  /**
   * Count records for an entity
   */
  async countRecords(entityName: string, userId: string): Promise<number> {
    const result = await query(
      `SELECT COUNT(*) as count 
       FROM records 
       WHERE entity_name = $1 AND user_id = $2`,
      [entityName, userId]
    );
    return parseInt(result.rows[0].count, 10);
  }
}