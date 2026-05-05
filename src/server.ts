import { createApp } from './app';
import { env } from './config/env';
import { pool } from './config/db';

const app = createApp();
const PORT = env.PORT;

// Graceful shutdown function
const gracefulShutdown = async (signal: string) => {
  console.log(`\n⚠️ Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Close database connections
    await pool.end();
    console.log('✅ Database connections closed');
    
    // Close server
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   🎉 BACKEND SKELETON IS RUNNING!                    ║
║                                                      ║
║   📡 Server: http://localhost:${PORT}                  ║
║   🌍 Environment: ${env.NODE_ENV.padEnd(20)}              ║
║                                                      ║
║   📌 Available endpoints:                            ║
║   POST   /auth/register                              ║
║   POST   /auth/login                                 ║
║   GET    /auth/me                                    ║
║   POST   /api/:entity                                ║
║   GET    /api/:entity                                ║
║   GET    /api/:entity/:id                            ║
║   PUT    /api/:entity/:id                            ║
║   DELETE /api/:entity/:id                            ║
║   GET    /health                                     ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
  `);
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});