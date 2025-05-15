// In trading212-routes.js, modify the file as follows:

import express from 'express';
import {
  getAccountsHandler,
  getPositionsHandler,
  getAccountInfoHandler,
  getAccountValueHandler,
  getAllAccountsValueHandler
} from './trading212-controller.js';
import { testApiConnection } from './trading212-api.js'; // Add this import

const router = express.Router();

// Trading212 API Endpoints
router.get('/accounts', getAccountsHandler);
router.get('/positions', getPositionsHandler);
router.get('/account', getAccountInfoHandler);
router.get('/value', getAccountValueHandler);
router.get('/all', getAllAccountsValueHandler);

// Add test endpoint
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

export default router;