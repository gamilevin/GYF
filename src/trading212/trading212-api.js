// src/trading212/trading212-api.js
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
  return makeRequest('/equity/account/info', accountId);
}

/**
 * Get account cash information - includes total portfolio value
 */
export async function getAccountCash(accountId = 1) {
  return makeRequest('/equity/account/cash', accountId);
}

/**
 * Get current positions
 */
export async function getPositions(accountId = 1) {
  try {
    return makeRequest('/equity/portfolio', accountId);
  } catch (error) {
    console.error(`Error fetching positions for account ${accountId}:`, error.message);
    throw error;
  }
}

/**
 * Get account value with cash and positions
 */
export async function getAccountValue(accountId = 1) {
  try {
    const account = getAccountById(accountId);
    
    // Get cash information (includes total account value) - this is our primary source of truth
    let cashInfo;
    try {
      cashInfo = await getAccountCash(accountId);
      console.log(`Successfully retrieved cash info for account ${accountId}`);
    } catch (error) {
      console.error(`Failed to get cash info for account ${accountId}:`, error.message);
      cashInfo = { total: 0, free: 0, invested: 0 };
    }
    
    // Get positions for detailed breakdown if available
    let positions = [];
    try {
      positions = await getPositions(accountId);
      console.log(`Successfully retrieved ${positions.length} positions for account ${accountId}`);
    } catch (error) {
      console.error(`Failed to get positions for account ${accountId}:`, error.message);
      positions = [];
    }
    
    // Process positions data
    const formattedPositions = [];
    
    if (positions && Array.isArray(positions)) {
      for (const position of positions) {
        try {
          const valueGBP = position.currentPrice * position.quantity;
          const pnlGBP = position.ppl || ((position.currentPrice - position.averagePrice) * position.quantity);
          const pnlPercentage = position.averagePrice > 0 ? 
            (pnlGBP / (position.averagePrice * position.quantity) * 100) : 0;
          
          formattedPositions.push({
            symbol: position.ticker,
            name: position.name || position.ticker.split('_')[0],
            quantity: position.quantity,
            currentPriceGBP: position.currentPrice,
            valueGBP,
            pnlGBP,
            pnlPercentage
          });
        } catch (error) {
          console.error(`Error processing position ${position.ticker}:`, error.message);
          // Continue with other positions
        }
      }
    }
    
    // Use the values from cash endpoint - our primary source of truth
    const totalValueGBP = cashInfo.total || 0;
    const cashValueGBP = cashInfo.free || 0;
    const investmentsValueGBP = cashInfo.invested || 0;
    const pnlTotal = cashInfo.ppl || 0;
    const resultTotal = cashInfo.result || 0;
    
    return {
      success: true,
      accountId,
      accountName: account.name,
      cashValueGBP,
      investmentsValueGBP,
      unrealizedPnL: pnlTotal,
      realizedPnL: resultTotal,
      totalValueGBP,
      positions: formattedPositions,
      positionsCount: formattedPositions.length,
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
      try {
        const accountValue = await getAccountValue(account.id);
        if (accountValue.success) {
          results.push(accountValue);
          totalValueGBP += accountValue.totalValueGBP;
        }
      } catch (error) {
        console.error(`Error getting value for account ${account.id}:`, error);
        // Continue with other accounts
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

/**
 * Explore all available endpoints to help with debugging
 */
export async function exploreAllEndpoints(accountId = 1) {
  const endpointsToTry = [
    '/equity/account',
    '/equity/account/info',
    '/equity/account/balance',
    '/equity/account/summary',
    '/equity/account/cash',
    '/equity/metadata/exchanges',
    '/equity/metadata/instruments',
    '/equity/portfolio',
    '/equity/history/dividends',
    '/equity/history/transactions'
  ];
  
  const results = {};
  
  for (const endpoint of endpointsToTry) {
    try {
      console.log(`Trying endpoint ${endpoint} for account ${accountId}...`);
      const response = await makeRequest(endpoint, accountId);
      
      results[endpoint] = {
        success: true,
        type: Array.isArray(response) ? 'array' : 'object',
        count: Array.isArray(response) ? response.length : null,
        sample: JSON.stringify(Array.isArray(response) ? response.slice(0, 2) : response).substring(0, 500) + '...'
      };
    } catch (error) {
      results[endpoint] = {
        success: false,
        error: error.message
      };
    }
  }
  
  return results;
}

/**
 * Format positions data in human-readable way
 */
export function formatPositionsData(data) {
  if (!data || !data.success) {
    return 'No positions data available or error retrieving data.';
  }
  
  // Start building the formatted output
  let output = '# Trading212 Portfolio\n\n';
  
  // Add total GBP value
  output += `## Total Portfolio Value: £${data.totalValueGBP.toFixed(2)}\n\n`;
  
  // If we have cash and investments breakdown
  if (data.cashValueGBP !== undefined && data.investmentsValueGBP !== undefined) {
    output += '## Balance Breakdown\n\n';
    output += '| Category | Value (GBP) | % of Total |\n';
    output += '|----------|-------------|------------|\n';
    
    const cashPercentage = (data.cashValueGBP / data.totalValueGBP * 100).toFixed(2);
    const investmentsPercentage = (data.investmentsValueGBP / data.totalValueGBP * 100).toFixed(2);
    
    output += `| Cash | £${data.cashValueGBP.toFixed(2)} | ${cashPercentage}% |\n`;
    output += `| Investments | £${data.investmentsValueGBP.toFixed(2)} | ${investmentsPercentage}% |\n`;
    output += `| **Total** | **£${data.totalValueGBP.toFixed(2)}** | **100.00%** |\n\n`;
  }
  
  // Add P&L information if available
  if (data.unrealizedPnL !== undefined || data.realizedPnL !== undefined) {
    output += '## Profit & Loss\n\n';
    output += '| Type | Value (GBP) |\n';
    output += '|------|-------------|\n';
    
    if (data.unrealizedPnL !== undefined) {
      output += `| Unrealized P&L | £${data.unrealizedPnL.toFixed(2)} |\n`;
    }
    
    if (data.realizedPnL !== undefined) {
      output += `| Realized P&L | £${data.realizedPnL.toFixed(2)} |\n`;
    }
    
    output += '\n';
  }
  
  // If we have data for multiple accounts, show summary per account
  if (data.accounts && data.accounts.length > 0) {
    output += '## Accounts Summary\n\n';
    output += '| Account | Value (GBP) | % of Total |\n';
    output += '|---------|-------------|------------|\n';
    
    data.accounts.forEach(account => {
      const percentage = (account.totalValueGBP / data.totalValueGBP * 100).toFixed(2);
      output += `| ${account.accountName} | £${account.totalValueGBP.toFixed(2)} | ${percentage}% |\n`;
    });
    
    output += '\n';
  }
  
  // Add positions table if we have positions
  if (data.positions && data.positions.length > 0) {
    output += `## Positions (${data.positions.length})\n\n`;
    output += '| Symbol | Name | Quantity | Current Price | Value (GBP) | P&L (GBP) | P&L % |\n';
    output += '|--------|------|----------|--------------|-------------|-----------|-------|\n';
    
    // Sort positions by value (highest first)
    const sortedPositions = [...data.positions].sort((a, b) => b.valueGBP - a.valueGBP);
    
    sortedPositions.forEach(position => {
      output += `| ${position.symbol} | ${position.name} | ${position.quantity} | £${position.currentPriceGBP.toFixed(2)} | £${position.valueGBP.toFixed(2)} | £${position.pnlGBP.toFixed(2)} | ${position.pnlPercentage.toFixed(2)}% |\n`;
    });
    
    output += '\n';
  } else if (data.accounts && data.accounts[0] && data.accounts[0].positions) {
    // Use positions from the first account if available
    output += `## Positions (${data.accounts[0].positions.length})\n\n`;
    output += '| Symbol | Name | Quantity | Current Price | Value (GBP) | P&L (GBP) | P&L % |\n';
    output += '|--------|------|----------|--------------|-------------|-----------|-------|\n';
    
    // Sort positions by value (highest first)
    const sortedPositions = [...data.accounts[0].positions].sort((a, b) => b.valueGBP - a.valueGBP);
    
    sortedPositions.forEach(position => {
      output += `| ${position.symbol} | ${position.name} | ${position.quantity} | £${position.currentPriceGBP.toFixed(2)} | £${position.valueGBP.toFixed(2)} | £${position.pnlGBP.toFixed(2)} | ${position.pnlPercentage.toFixed(2)}% |\n`;
    });
    
    output += '\n';
  }
  
  return output;
}