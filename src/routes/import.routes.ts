import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { query } from '../config/db';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/import/:entity - Import CSV to entity
router.post(
  '/api/import/:entity',
  authMiddleware,
  upload.single('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { entity } = req.params;
      const userId = req.user?.id;
      const { columnMapping } = req.body; // Optional column mapping JSON

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      // Parse CSV
      const results: any[] = [];
      const buffer = req.file.buffer;
      const readableStream = Readable.from(buffer.toString());

      await new Promise((resolve, reject) => {
        readableStream
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      if (results.length === 0) {
        return res.status(400).json({ success: false, error: 'CSV file is empty' });
      }

      // Get headers from first row
      const headers = Object.keys(results[0]);
      
      // Parse column mapping if provided
      let mapping: Record<string, string> = {};
      if (columnMapping) {
        try {
          mapping = typeof columnMapping === 'string' ? JSON.parse(columnMapping) : columnMapping;
        } catch (e) {
          console.error('Invalid column mapping:', e);
        }
      }

      // Insert records
      let imported = 0;
      let failed = 0;
      const errors: any[] = [];

      for (const row of results) {
        try {
          // Map columns if mapping provided, otherwise use original headers
          const mappedData: any = {};
          
          if (Object.keys(mapping).length > 0) {
            // Use column mapping
            for (const [csvColumn, dbField] of Object.entries(mapping)) {
              if (row[csvColumn] !== undefined) {
                mappedData[dbField] = row[csvColumn];
              }
            }
          } else {
            // Use all columns as-is
            for (const header of headers) {
              mappedData[header] = row[header];
            }
          }

          // Insert record
          await query(
            `INSERT INTO records (entity_name, data, user_id) 
             VALUES ($1, $2, $3)`,
            [entity, mappedData, userId]
          );
          imported++;
        } catch (err: any) {
          failed++;
          errors.push({ row, error: err.message });
        }
      }

      // Create notification for import completion
      await query(
        `INSERT INTO notifications (user_id, message, type, read) 
         VALUES ($1, $2, $3, $4)`,
        [userId, `CSV Import: ${imported} records imported to ${entity} (${failed} failed)`, 'info', false]
      );

      res.json({
        success: true,
        message: `Imported ${imported} records to ${entity}`,
        data: {
          imported,
          failed,
          errors: errors.slice(0, 10), // Return first 10 errors
          total: results.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;