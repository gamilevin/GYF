// src/trading212/trading212-controller.js
import {
  getPositions,
  getAccountInfo,
  getAccountValue,
  getAllAccountsValue
} from './trading212-api.js';
import { getConfiguredAccounts } from './trading212-client.js';

/**
 * Format positions data in human-readable way
 */
function formatPositionsData(data) {
  if (!data || !data.success) {
    return 'No positions data available or error retrieving data.';
  }
  
  // Start building the formatted output
  let output = '# Trading212 Portfolio\n\n';
  
  // Add total GBP value
  output += `## Total Portfolio Value: £${data.totalValueGBP.toFixed(2)}\n\n`;
  
  // If we have data for multiple accounts, show summary per account
  if (data.accounts && data.accounts.length > 0) {
    output += '## Accounts Summary\n\n';
    output += '| Account | Value (GBP) | # of Positions |\n';
    output += '|---------|-------------|---------------|\n';
    
    data.accounts.forEach(account => {
      output += `| ${account.accountName} | £${account.totalValueGBP.toFixed(2)} | ${account.positions.length} |\n`;
    });
    
    output += '\n';
  }
  
  // Add positions table
  output += '## Positions\n\n';
  output += '| Symbol | Name | Quantity | Current Price | Value (GBP) | P&L (GBP) | P&L % |\n';
  output += '|--------|------|----------|--------------|-------------|-----------|-------|\n';
  
  // Use positions from data directly, or from the first account if available
  const positions = data.positions || (data.accounts && data.accounts[0] ? data.accounts[0].positions : []);
  
  positions.forEach(position => {
    output += `| ${position.symbol} | ${position.name} | ${position.quantity} | £${position.currentPriceGBP.toFixed(2)} | £${position.valueGBP.toFixed(2)} | £${position.pnlGBP.toFixed(2)} | ${position.pnlPercentage.toFixed(2)}% |\n`;
  });
  
  output += '\n';
  
  return output;
}

/**
 * Get configured accounts
 */
export async function getAccountsHandler(req, res) {
  try {
    const accounts = getConfiguredAccounts();
    
    res.json({
      success: true,
      accounts: accounts.map(account => ({
        id: account.id,
        name: account.name
      })),
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in getAccountsHandler:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get positions for a specific account
 */
export async function getPositionsHandler(req, res) {
  try {
    const accountId = parseInt(req.query.accountId) || 1;
    
    console.log(`Fetching positions for Trading212 account ${accountId}...`);
    const data = await getPositions(accountId);
    
    res.json({
      success: true,
      accountId,
      data,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in getPositionsHandler:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get account info for a specific account
 */
export async function getAccountInfoHandler(req, res) {
  try {
    const accountId = parseInt(req.query.accountId) || 1;
    
    console.log(`Fetching account info for Trading212 account ${accountId}...`);
    const data = await getAccountInfo(accountId);
    
    res.json({
      success: true,
      accountId,
      data,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in getAccountInfoHandler:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get account value with positions for a specific account
 */
export async function getAccountValueHandler(req, res) {
  try {
    const accountId = parseInt(req.query.accountId) || 1;
    const format = req.query.format === 'true';
    
    console.log(`Fetching account value for Trading212 account ${accountId}...`);
    const data = await getAccountValue(accountId);
    
    if (format) {
      res.type('text/plain').send(formatPositionsData(data));
    } else {
      res.json(data);
    }
  } catch (error) {
    console.error('Error in getAccountValueHandler:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get all accounts' values
 */
export async function getAllAccountsValueHandler(req, res) {
  try {
    const format = req.query.format === 'true';
    
    console.log('Fetching all Trading212 accounts values...');
    const data = await getAllAccountsValue();
    
    if (format) {
      res.type('text/plain').send(formatPositionsData(data));
    } else {
      res.json(data);
    }
  } catch (error) {
    console.error('Error in getAllAccountsValueHandler:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}