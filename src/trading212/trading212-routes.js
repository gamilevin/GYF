// src/trading212/trading212-routes.js
import express from 'express';
import {
  getAccountsHandler,
  getPositionsHandler,
  getAccountInfoHandler,
  getAccountValueHandler,
  getAllAccountsValueHandler
} from './trading212-controller.js';
import { testApiConnection, exploreAllEndpoints } from './trading212-api.js';

const router = express.Router();

// Trading212 API Endpoints
router.get('/accounts', getAccountsHandler);
router.get('/positions', getPositionsHandler);
router.get('/account', getAccountInfoHandler);
router.get('/value', getAccountValueHandler);
router.get('/all', getAllAccountsValueHandler);

// Test endpoint
router.get('/test', async (req, res) => {
  try {
    const accountId = parseInt(req.query.accountId) || 1;
    const result = await testApiConnection(accountId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Explore all available endpoints
router.get('/explore', async (req, res) => {
  try {
    const accountId = parseInt(req.query.accountId) || 1;
    const results = await exploreAllEndpoints(accountId);
    res.json(results);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;