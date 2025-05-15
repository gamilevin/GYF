// src/core/server.js
import express from 'express';
import bybitRoutes from '../bybit/bybit-routes.js';
import trading212Routes from '../trading212/trading212-routes.js';
/**
 * Create Express server with all necessary middleware and routes
 * @returns {express.Application} Express application
 */
export function createServer() {
  // Initialize Express app
  const app = express();
  
  // Middleware
  app.use(express.json());
  
  // Simple logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
  
  // Routes
  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      service: 'GYF-backend',
      version: '1.0.0'
    });
  });
  
  // API Routes
  app.use('/api/bybit', bybitRoutes);
  app.use('/api/trading212', trading212Routes);
  
  // Basic error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err.message
    });
  });
  
  return app;
}
