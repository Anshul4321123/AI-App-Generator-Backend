import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorMiddleware = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default values
  let statusCode = 500;
  let message = 'Internal server error';
  let isOperational = false;

  // Check if it's our custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  } else if (err.message) {
    // Handle known error types
    if (err.message.includes('duplicate key')) {
      statusCode = 409;
      message = 'Duplicate entry found';
    } else if (err.message.includes('foreign key')) {
      statusCode = 400;
      message = 'Invalid reference';
    } else if (err.message.includes('not null')) {
      statusCode = 400;
      message = 'Missing required field';
    } else {
      message = err.message;
    }
  }

  // Log errors
  if (statusCode === 500) {
    console.error('❌ Server Error:', err);
  } else if (env.NODE_ENV === 'development') {
    console.log('⚠️ Client Error:', { statusCode, message });
  }

  // Send response
  res.status(statusCode).json({
    error: message,
    ...(env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.message,
    }),
  });
};

// 404 handler for undefined routes
export const notFoundMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
  });
};