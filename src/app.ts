import express, { Application } from 'express';
import cors from 'cors';
import router from './routes';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import { env } from './config/env';

export const createApp = (): Application => {
  const app = express();

  // CORS configuration
  app.use(cors({
    origin: env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
    credentials: true,
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging (development only)
  if (env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      console.log(`📨 ${req.method} ${req.path}`);
      next();
    });
  }

  // Routes
  app.use('/', router);

  // 404 handler for undefined routes
  app.use(notFoundMiddleware);

  // Global error handler (must be last)
  app.use(errorMiddleware);

  return app;
};