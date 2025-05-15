// Updated src/trading212/trading212-api.js
import { getApiClient, getConfiguredAccounts, getAccountById } from './trading212-client.js';

/**
 * Helper function to make API requests and handle errors
 */
async function makeRequest(endpoint, accountId = 1) {
  try {
    const client = getApiClient(accountId);
    const response = await client.get(endpoint);
    return response.data;
  } catch (error) {
    console.error(`Error making request to ${endpoint} for account ${accountId}:`, error.message);
    throw new Error(`Trading212 API request failed: ${error.message}`);
  }
}

/**
 * Get account information
 */
export async function getAccountInfo(accountId = 1) {
  // Updated to use the correct endpoint
  return makeRequest('/equity/account/info', accountId);
}

/**
 * Get current positions
 */
export async function getPositions(accountId = 1) {
  // Using the portfolio endpoint for positions
  return makeRequest('/equity/portfolio', accountId);
}

/**
 * Get account value with positions
 */
export async function getAccountValue(accountId = 1) {
  try {
    const account = getAccountById(accountId);
    
    // Get account info first to check for cash balance
    const accountInfo = await getAccountInfo(accountId);
    
    // Get portfolio/positions
    const positions = await getPositions(accountId);
    
    // Calculate total value in GBP
    let totalValueGBP = 0;
    const formattedPositions = [];
    
    // Process positions data
    if (positions && Array.isArray(positions)) {
      for (const position of positions) {
        const valueGBP = position.currentPrice * position.quantity;
        const pnlGBP = (position.currentPrice - position.averagePrice) * position.quantity;
        const pnlPercentage = ((position.currentPrice - position.averagePrice) / position.averagePrice) * 100;
        
        formattedPositions.push({
          symbol: position.ticker || position.symbol,
          name: position.name || position.instrumentName,
          quantity: position.quantity,
          currentPriceGBP: position.currentPrice,
          valueGBP,
          pnlGBP,
          pnlPercentage
        });
        
        totalValueGBP += valueGBP;
      }
    }
    
    // Add cash balance if available
    if (accountInfo && accountInfo.cash && accountInfo.cash.value) {
      totalValueGBP += accountInfo.cash.value;
    }
    
    return {
      success: true,
      accountId,
      accountName: account.name,
      totalValueGBP,
      positions: formattedPositions,
      accountInfo,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error(`Error getting account value for account ${accountId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all accounts' values
 */
export async function getAllAccountsValue() {
  try {
    const accounts = getConfiguredAccounts();
    const results = [];
    let totalValueGBP = 0;
    
    // Get data for each account
    for (const account of accounts) {
      const accountValue = await getAccountValue(account.id);
      if (accountValue.success) {
        results.push(accountValue);
        totalValueGBP += accountValue.totalValueGBP;
      }
    }
    
    return {
      success: true,
      totalValueGBP,
      accounts: results,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error getting all accounts value:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test API connection with a simple endpoint
 */
export async function testApiConnection(accountId = 1) {
  try {
    const client = getApiClient(accountId);
    
    // Use a known working endpoint from your example
    console.log("Testing Trading212 API connection...");
    const response = await client.get('/equity/metadata/instruments');
    
    console.log("API connection successful:", response.status);
    // Limit the data returned to avoid overwhelming the response
    const limitedData = Array.isArray(response.data) 
      ? response.data.slice(0, 5) 
      : response.data;
      
    return {
      success: true,
      status: response.status,
      data: limitedData
    };
  } catch (error) {
    console.error("API connection test failed:", error.message);
    
    // Log detailed error information
    if (error.response) {
      console.error("Error status:", error.response.status);
      console.error("Error data:", error.response.data);
    }
    
    return {
      success: false,
      error: error.message,
      details: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : null
    };
  }
}