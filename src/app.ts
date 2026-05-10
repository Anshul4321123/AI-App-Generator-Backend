import express, { Application } from 'express';
import cors from 'cors';
import router from './routes';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import { env } from './config/env';

export const createApp = (): Application => {
  const app = express();

  // CORS configuration - Allow frontend domains
  const allowedOrigins = [
    'http://localhost:3000',           // Local development
    'https://ai-app-generator-frontend.vercel.app',  // Your Vercel frontend
    /\.vercel\.app$/,                   // All Vercel preview deployments
  ];

  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      // Check if origin is allowed
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return allowed === origin;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        // console.log('❌ CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,  // Allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging (development only)
  if (env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      // console.log(`📨 ${req.method} ${req.path}`);
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