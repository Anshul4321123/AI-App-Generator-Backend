import { AppError } from '../middleware/error.middleware';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate request body for CRUD operations
 * DAY 1: Only basic checks (not empty, is object)
 */
export function validateRequestBody(body: any): ValidationResult {
  // Check if body exists
  if (!body) {
    return {
      isValid: false,
      error: 'Request body is required',
    };
  }

  // Check if body is an object
  if (typeof body !== 'object') {
    return {
      isValid: false,
      error: 'Request body must be a JSON object',
    };
  }

  // Check if body is not empty
  if (Object.keys(body).length === 0) {
    return {
      isValid: false,
      error: 'Request body cannot be empty',
    };
  }

  return { isValid: true };
}

/**
 * Validate entity name (for /api/:entity routes)
 */
export function validateEntityName(entityName: string): ValidationResult {
  if (!entityName || typeof entityName !== 'string') {
    return {
      isValid: false,
      error: 'Entity name is required and must be a string',
    };
  }

  // Sanitize: only allow letters, numbers, underscores, and hyphens
  const sanitized = entityName.replace(/[^a-zA-Z0-9_-]/g, '');
  
  if (sanitized !== entityName) {
    return {
      isValid: false,
      error: 'Entity name can only contain letters, numbers, underscores, and hyphens',
    };
  }

  if (entityName.length > 100) {
    return {
      isValid: false,
      error: 'Entity name cannot exceed 100 characters',
    };
  }

  return { isValid: true };
}

/**
 * Validate UUID format
 */
export function validateUUID(id: string): ValidationResult {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!id || typeof id !== 'string') {
    return {
      isValid: false,
      error: 'ID is required and must be a string',
    };
  }

  if (!uuidRegex.test(id)) {
    return {
      isValid: false,
      error: 'Invalid UUID format',
    };
  }

  return { isValid: true };
}

/**
 * Sanitize data for storage
 * (Remove any sensitive fields that shouldn't be stored)
 */
export function sanitizeData(data: Record<string, any>): Record<string, any> {
  // Clone to avoid mutating original
  const sanitized = { ...data };
  
  // Remove fields that should never be stored directly
  const forbiddenFields = ['password', 'password_hash', 'token', 'jwt'];
  for (const field of forbiddenFields) {
    delete sanitized[field];
  }
  
  return sanitized;
}

/**
 * Basic email validation (for auth)
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      error: 'Email is required',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: 'Invalid email format',
    };
  }

  return { isValid: true };
}

/**
 * Basic password validation (min length)
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      error: 'Password is required',
    };
  }

  if (password.length < 6) {
    return {
      isValid: false,
      error: 'Password must be at least 6 characters long',
    };
  }

  return { isValid: true };
}