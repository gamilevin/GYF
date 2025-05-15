// src/bybit/controller.js
import { 
  getAccountCoinsBalance, 
  getAccountCoinBalance,
  getFundingAccountBalance,
  getTransactionHistory,
  getDepositRecords,
  getWithdrawalRecords
} from './bybit-api.js';

/**
 * Format balance data in a human-readable way
 * @param {Object} data - Raw balance data
 * @returns {String} - Formatted balance data
 */
function formatBalanceData(data) {
  if (!data || !data.success) {
    return 'No balance data available or error retrieving data.';
  }
  
  // Start building the formatted output
  let output = '# ByBit Funding Account Balance\n\n';
  
  // Add total USD value
  output += `## Total Account Value: $${data.totalUsdValue.toFixed(2)}\n\n`;
  
  // Add asset table
  output += '## Assets\n\n';
  output += '| Asset | Wallet Balance | USD Value | Price |\n';
  output += '|-------|---------------|-----------|-------|\n';
  
  data.assets.forEach(asset => {
    output += `| ${asset.coin} | ${asset.walletBalance} | $${asset.usdValue.toFixed(2)} | $${asset.coinPrice.toFixed(asset.coinPrice < 0.1 ? 8 : 2)} |\n`;
  });
  
  output += '\n';
  
  // Add raw data summary
  if (data.rawData.fundAccount) {
    const fundAccount = data.rawData.fundAccount;
    output += '## Account Details\n\n';
    output += `- Member ID: ${fundAccount.memberId || 'N/A'}\n`;
    output += `- Account Type: ${fundAccount.accountType || 'N/A'}\n`;
    output += `- Total Coins: ${fundAccount.balance ? fundAccount.balance.length : 0}\n\n`;
  }
  
  return output;
}

/**
 * Get account coins balance for a specific account type
 */
export async function getAccountCoinsBalanceHandler(req, res) {
  try {
    const accountType = req.query.accountType || 'FUND';
    const coins = req.query.coins || '';
    
    console.log(`Fetching account coins balance for account type: ${accountType}`);
    const response = await getAccountCoinsBalance(accountType, coins);
    
    if (response.retCode === 0) {
      res.json({
        success: true,
        data: response.result,
        timestamp: Date.now()
      });
    } else {
      res.status(400).json({
        success: false,
        error: response.retMsg,
        code: response.retCode
      });
    }
  } catch (error) {
    console.error('Error in getAccountCoinsBalanceHandler:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
}

/**
 * Get account coin balance for a specific coin
 */
export async function getAccountCoinBalanceHandler(req, res) {
  try {
    const accountType = req.query.accountType || 'FUND';
    const coin = req.query.coin;
    
    if (!coin) {
      return res.status(400).json({
        success: false,
        error: 'Coin parameter is required'
      });
    }
    
    console.log(`Fetching account coin balance for ${coin} in account type: ${accountType}`);
    const response = await getAccountCoinBalance(accountType, coin);
    
    if (response.retCode === 0) {
      res.json({
        success: true,
        data: response.result,
        timestamp: Date.now()
      });
    } else {
      res.status(400).json({
        success: false,
        error: response.retMsg,
        code: response.retCode
      });
    }
  } catch (error) {
    console.error('Error in getAccountCoinBalanceHandler:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
}

/**
 * Get funding account balance with USD values
 */
export async function getFundingAccountBalanceHandler(req, res) {
  try {
    console.log('Fetching funding account balance with USD values...');
    const response = await getFundingAccountBalance();
    
    // Check if format parameter is set
    const format = req.query.format === 'true';
    
    if (format) {
      // Return formatted text response
      const formattedResponse = formatBalanceData(response);
      res.type('text/plain').send(formattedResponse);
    } else {
      // Return JSON response
      res.json(response);
    }
  } catch (error) {
    console.error('Error in getFundingAccountBalanceHandler:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
}

/**
 * Get formatted funding account balance (convenience endpoint)
 */
export async function getFormattedFundingBalanceHandler(req, res) {
  try {
    console.log('Fetching formatted funding account balance...');
    const response = await getFundingAccountBalance();
    const formattedResponse = formatBalanceData(response);
    res.type('text/plain').send(formattedResponse);
  } catch (error) {
    console.error('Error in getFormattedFundingBalanceHandler:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
}

/**
 * Get transaction history
 */
export async function getTransactionHistoryHandler(req, res) {
  try {
    console.log('Fetching transaction history...');
    const params = {
      limit: req.query.limit || '50',
      coin: req.query.coin || ''
    };
    
    const response = await getTransactionHistory(params);
    
    if (response.retCode === 0) {
      res.json({
        success: true,
        data: response.result,
        timestamp: Date.now()
      });
    } else {
      res.status(400).json({
        success: false,
        error: response.retMsg,
        code: response.retCode
      });
    }
  } catch (error) {
    console.error('Error in getTransactionHistoryHandler:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
}

/**
 * Get deposit records
 */
export async function getDepositRecordsHandler(req, res) {
  try {
    console.log('Fetching deposit records...');
    const params = {
      limit: req.query.limit || '50',
      coin: req.query.coin || ''
    };
    
    const response = await getDepositRecords(params);
    
    if (response.retCode === 0) {
      res.json({
        success: true,
        data: response.result,
        timestamp: Date.now()
      });
    } else {
      res.status(400).json({
        success: false,
        error: response.retMsg,
        code: response.retCode
      });
    }
  } catch (error) {
    console.error('Error in getDepositRecordsHandler:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
}

/**
 * Get withdrawal records
 */
export async function getWithdrawalRecordsHandler(req, res) {
  try {
    console.log('Fetching withdrawal records...');
    const params = {
      limit: req.query.limit || '50',
      coin: req.query.coin || ''
    };
    
    const response = await getWithdrawalRecords(params);
    
    if (response.retCode === 0) {
      res.json({
        success: true,
        data: response.result,
        timestamp: Date.now()
      });
    } else {
      res.status(400).json({
        success: false,
        error: response.retMsg,
        code: response.retCode
      });
    }
  } catch (error) {
    console.error('Error in getWithdrawalRecordsHandler:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
}
