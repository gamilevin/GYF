// src/bybit/bybit-routes.js
import express from 'express';
import { 
  getBalanceHandler, 
  getFormattedBalanceHandler,
  testConnectionHandler,
  debugConnectionHandler
} from './bybit-controller.js';

const router = express.Router();

// Bybit API Endpoints
router.get('/balance', getBalanceHandler);
router.get('/formatted', getFormattedBalanceHandler);
router.get('/test', testConnectionHandler);
router.get('/debug', debugConnectionHandler);

export default router;