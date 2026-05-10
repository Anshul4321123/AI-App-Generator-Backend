import { Router, Response, NextFunction } from 'express';
import { query } from '../config/db';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { requireAdmin, requireTeamAccess } from '../middleware/rbac.middleware';

const router = Router();

// GET /api/tasks/dashboard - Get task metrics for dashboard
router.get('/api/tasks/dashboard', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    let taskQuery = `
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN data->>'status' = 'done' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN data->>'status' != 'done' OR data->>'status' IS NULL THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN data->>'due_date' < NOW()::date AND (data->>'status' != 'done' OR data->>'status' IS NULL) THEN 1 END) as overdue_tasks
      FROM records 
      WHERE entity_name = 'tasks'
    `;
    
    // If not admin, filter by assigned_users or assigned_to
    if (userRole !== 'admin') {
      taskQuery += ` AND (data->>'assigned_users' LIKE $1 OR data->>'assigned_to' = $2)`;
      const result = await query(taskQuery, [`%"${userId}"%`, userId]);
      res.json({ success: true, data: result.rows[0] });
    } else {
      const result = await query(taskQuery);
      res.json({ success: true, data: result.rows[0] });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks - Get tasks with role-based filtering
router.get('/api/tasks', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { status, assignedTo } = req.query;
    
    let queryText = `
      SELECT id, data, created_at 
      FROM records 
      WHERE entity_name = 'tasks'
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    // Role-based filtering
    if (userRole !== 'admin') {
      queryText += ` AND (data->>'assigned_users' LIKE $${paramIndex} OR data->>'assigned_to' = $${paramIndex + 1})`;
      params.push(`%"${userId}"%`, userId);
      paramIndex += 2;
    }
    
    // Additional filters
    if (status) {
      queryText += ` AND data->>'status' = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (assignedTo) {
      queryText += ` AND (data->>'assigned_users' LIKE $${paramIndex} OR data->>'assigned_to' = $${paramIndex})`;
      params.push(`%"${assignedTo}"%`);
      paramIndex++;
    }
    
    queryText += ` ORDER BY created_at DESC`;
    
    const result = await query(queryText, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// PUT /api/tasks/:id - Update full task (admin only)
router.put('/api/tasks/:id', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id;
    const { title, status, priority, assigned_users, due_date, description, story_points } = req.body;
    
    // Get existing task
    const existingResult = await query(
      `SELECT data FROM records WHERE id = $1 AND entity_name = 'tasks'`,
      [taskId]
    );
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    
    const existingData = existingResult.rows[0].data;
    
    // Merge updates
    const updatedData = {
      ...existingData,
      title: title || existingData.title,
      status: status || existingData.status,
      priority: priority || existingData.priority,
      assigned_users: assigned_users || existingData.assigned_users,
      due_date: due_date || existingData.due_date,
      description: description || existingData.description,
      story_points: story_points || existingData.story_points,
      updated_at: new Date().toISOString()
    };
    
    await query(
      `UPDATE records SET data = $1 WHERE id = $2`,
      [updatedData, taskId]
    );
    
    res.json({ success: true, message: 'Task updated successfully' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/tasks/:id/status - Update task status (members can update their own tasks)
router.put('/api/tasks/:id/status', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { status } = req.body;
    
    // Get the task
    const taskResult = await query(
      `SELECT data FROM records WHERE id = $1 AND entity_name = 'tasks'`,
      [taskId]
    );
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    
    const task = taskResult.rows[0];
    const assignedUsers = task.data?.assigned_users || [];
    const assignedTo = task.data?.assigned_to;
    
    // Check authorization
    const isAssigned = assignedUsers.includes(userId) || assignedTo === userId;
    
    if (userRole !== 'admin' && !isAssigned) {
      return res.status(403).json({ error: 'You can only update tasks assigned to you' });
    }
    
    // Update status
    const updatedData = {
      ...task.data,
      status,
      updated_at: new Date().toISOString()
    };
    
    await query(
      `UPDATE records SET data = $1 WHERE id = $2`,
      [updatedData, taskId]
    );
    
    res.json({ success: true, message: 'Task status updated' });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks - Create task (admin only)
router.post('/api/tasks', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { title, status, priority, assigned_users, due_date, description, story_points } = req.body;
    
    if (!title) {
      return res.status(400).json({ success: false, error: 'Task title is required' });
    }
    
    const taskData = {
      title,
      status: status || 'todo',
      priority: priority || 'medium',
      assigned_users: assigned_users || [],
      due_date: due_date || null,
      description: description || '',
      story_points: story_points || 0,
      created_by: userId,
      created_at: new Date().toISOString()
    };
    
    const result = await query(
      `INSERT INTO records (entity_name, data, user_id) 
       VALUES ('tasks', $1, $2) 
       RETURNING id, data`,
      [taskData, userId]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/:id - Delete task (admin only)
router.delete('/api/tasks/:id', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id;
    
    await query(
      `DELETE FROM records WHERE id = $1 AND entity_name = 'tasks'`,
      [taskId]
    );
    
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/tasks/:id - Update full task
router.put('/api/tasks/:id', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id;
    const { title, status, priority, assigned_users, due_date, description, story_points } = req.body;
    
    // console.log('📝 Updating task:', { taskId, title, status, priority, assigned_users });
    
    const result = await query(
      `UPDATE records 
       SET data = jsonb_set(data, '{title}', $1) || 
                  jsonb_set(data, '{status}', $2) || 
                  jsonb_set(data, '{priority}', $3) || 
                  jsonb_set(data, '{assigned_users}', $4) || 
                  jsonb_set(data, '{due_date}', $5) || 
                  jsonb_set(data, '{description}', $6) || 
                  jsonb_set(data, '{story_points}', $7)
       WHERE id = $8 AND entity_name = 'tasks'
       RETURNING id, data`,
      [title, status, priority, JSON.stringify(assigned_users), due_date, description, story_points, taskId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    
    res.json({ success: true, message: 'Task updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Update error:', error);
    next(error);
  }
});

export default router;