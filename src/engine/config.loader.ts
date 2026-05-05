import { query } from '../config/db';

export interface AppConfig {
  id: string;
  name: string;
  config: Record<string, any>;
  created_by: string;
  created_at: Date;
}

// Cache for app configs (simple in-memory cache)
const configCache = new Map<string, { config: AppConfig; timestamp: number }>();
const CACHE_TTL = 60000; // 60 seconds

/**
 * Fetch app configuration by app_id
 * Returns fallback empty config if app doesn't exist
 */
export async function getAppConfig(appId: string): Promise<Record<string, any>> {
  try {
    // Check cache first
    const cached = configCache.get(appId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.config.config;
    }

    // Query database
    const result = await query(
      'SELECT id, name, config, created_by, created_at FROM apps WHERE id = $1',
      [appId]
    );

    if (result.rows.length === 0) {
      // Return fallback empty config
      return {};
    }

    const appConfig: AppConfig = result.rows[0];
    
    // Update cache
    configCache.set(appId, {
      config: appConfig,
      timestamp: Date.now(),
    });

    // Return the JSONB config field
    return appConfig.config || {};
  } catch (error) {
    console.error('Error loading app config:', error);
    // Return empty config on error (fail gracefully)
    return {};
  }
}

/**
 * Save or update app configuration
 */
export async function setAppConfig(
  appId: string,
  name: string,
  config: Record<string, any>,
  userId: string
): Promise<void> {
  // Check if app exists
  const existing = await query('SELECT id FROM apps WHERE id = $1', [appId]);
  
  if (existing.rows.length === 0) {
    // Create new app
    await query(
      'INSERT INTO apps (id, name, config, created_by) VALUES ($1, $2, $3, $4)',
      [appId, name, config, userId]
    );
  } else {
    // Update existing
    await query(
      'UPDATE apps SET name = $2, config = $3 WHERE id = $1',
      [appId, name, config]
    );
  }
  
  // Invalidate cache
  configCache.delete(appId);
}

/**
 * Clear config cache (useful for testing)
 */
export function clearConfigCache(): void {
  configCache.clear();
}

/**
 * Get all apps for a user
 */
export async function getUserApps(userId: string): Promise<AppConfig[]> {
  const result = await query(
    'SELECT id, name, config, created_by, created_at FROM apps WHERE created_by = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}