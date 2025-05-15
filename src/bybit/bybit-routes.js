// src/bybit/routes.js
import express from 'express';
import {
  getAccountCoinsBalanceHandler,
  getAccountCoinBalanceHandler,
  getFundingAccountBalanceHandler,
  getFormattedFundingBalanceHandler,
  getTransactionHistoryHandler,
  getDepositRecordsHandler,
  getWithdrawalRecordsHandler
} from './bybit-controller.js';

const router = express.Router();

// Asset API Endpoints
router.get('/balance/coins', getAccountCoinsBalanceHandler);
router.get('/balance/coin', getAccountCoinBalanceHandler);
router.get('/balance', getFundingAccountBalanceHandler);
router.get('/formatted', getFormattedFundingBalanceHandler);
router.get('/transactions', getTransactionHistoryHandler);
router.get('/deposits', getDepositRecordsHandler);
router.get('/withdrawals', getWithdrawalRecordsHandler);

export default router;
