// src/trading212/trading212-client.js
import axios from 'axios';
import 'dotenv/config';

// Base configuration for Trading212 API
const BASE_URL = 'https://live.trading212.com/api/v0';

// Get API keys from environment variables - specific keys for you and Meytal
const API_KEY_AMI = process.env.TRADING212_API_KEY_AMI;
const API_KEY_MEYTAL = process.env.TRADING212_API_KEY_MEYTAL; // May be undefined for now

// Define account configurations
const ACCOUNTS = [
  {
    id: 1,
    name: 'Ami\'s Account',
    apiKey: API_KEY_AMI,
    enabled: !!API_KEY_AMI // Enable only if API key exists
  }
];

// Add Meytal's account only if the API key is configured
if (API_KEY_MEYTAL) {
  ACCOUNTS.push({
    id: 2,
    name: 'Meytal\'s Account',
    apiKey: API_KEY_MEYTAL,
    enabled: true
  });
}

/**
 * Get all configured accounts (without exposing API keys)
 * Only returns enabled accounts
 */
export function getConfiguredAccounts() {
  return ACCOUNTS.filter(acc => acc.enabled)
    .map(({ id, name }) => ({ id, name }));
}

/**
 * Get account configuration by ID
 */
export function getAccountById(accountId) {
  const account = ACCOUNTS.find(acc => acc.id === accountId);
  if (!account) {
    throw new Error(`Trading212 account with ID ${accountId} not found`);
  }
  if (!account.enabled) {
    throw new Error(`Trading212 account with ID ${accountId} (${account.name}) is not enabled`);
  }
  return account;
}

/**
 * Get API client for a specific account
 */
export function getApiClient(accountId = 1) {
  const account = getAccountById(accountId);
  const apiKey = account.apiKey;
  
  if (!apiKey) {
    throw new Error(`API key for Trading212 account ${accountId} (${account.name}) not configured`);
  }
  
  // Debug information (remove in production)
  console.log(`Creating API client for account ${accountId} (${account.name})`);
  console.log(`API key length: ${apiKey.length}`);
  console.log(`API key starts with: ${apiKey.substring(0, 4)}...`);
  
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'Authorization': apiKey, // Direct API key without 'Bearer ' prefix
      'Content-Type': 'application/json'
    }
  });
}