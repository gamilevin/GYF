// src/bybit/api.js
import { makeSignedRequest } from './bybit-client.js';

/**
 * Get the complete account coins balance
 * @param {String} accountType - Account type (FUND, UNIFIED, CONTRACT, SPOT)
 * @param {String} coins - Optional comma-separated list of coins
 * @returns {Promise<Object>} - Account coins balance data
 */
export async function getAccountCoinsBalance(accountType = 'FUND', coins = '') {
  const params = {
    accountType
  };
  
  if (coins) {
    params.coin = coins;
  }
  
  console.log(`Fetching account coins balance for account type: ${accountType}`);
  return makeSignedRequest('/v5/asset/transfer/query-account-coins-balance', 'GET', params);
}

/**
 * Get detailed information for a specific coin in an account
 * @param {String} accountType - Account type (FUND, UNIFIED, CONTRACT, SPOT)
 * @param {String} coin - Coin name (e.g., BTC, USDT)
 * @returns {Promise<Object>} - Detailed coin balance data
 */
export async function getAccountCoinBalance(accountType = 'FUND', coin) {
  if (!coin) {
    throw new Error('Coin parameter is required');
  }
  
  const params = {
    accountType,
    coin
  };
  
  console.log(`Fetching detailed balance for ${coin} in account type: ${accountType}`);
  return makeSignedRequest('/v5/asset/transfer/query-account-coin-balance', 'GET', params);
}

/**
 * Get current price for a symbol
 * @param {String} symbol - Symbol (e.g., BTCUSDT)
 * @returns {Promise<Object>} - Ticker data
 */
export async function getSymbolPrice(symbol) {
  const params = {
    symbol
  };
  
  console.log(`Fetching price for symbol: ${symbol}`);
  return makeSignedRequest('/v5/market/tickers', 'GET', params);
}

/**
 * Get funding account balance with USD conversion
 * @returns {Promise<Object>} - Funding account data with USD values
 */
export async function getFundingAccountBalance() {
  try {
    console.log('Fetching funding account balance...');
    
    // Get funding account data
    const fundAccountResponse = await getAccountCoinsBalance('FUND');
    
    if (fundAccountResponse.retCode !== 0) {
      console.error('Error fetching FUND account:', fundAccountResponse.retMsg);
      throw new Error(`Failed to fetch FUND account: ${fundAccountResponse.retMsg}`);
    }
    
    // Extract balance data
    const fundAccount = fundAccountResponse.result || {};
    const assets = [];
    let totalUsdValue = 0;
    
    // Get price data for all assets asynchronously
    const pricePromises = [];
    const coinPriceMap = {};
    
    // Process FUND account assets
    if (fundAccount.balance && Array.isArray(fundAccount.balance)) {
      // Create price requests for non-stablecoin assets
      for (const coin of fundAccount.balance) {
        const coinName = coin.coin;
        if (coinName !== 'USDT' && coinName !== 'USDC' && coinName !== 'USD' && 
            parseFloat(coin.walletBalance) > 0) {
          // Get price for each coin in USD
          const symbol = `${coinName}USDT`;
          pricePromises.push(
            getSymbolPrice(symbol)
              .then(priceResponse => {
                if (priceResponse.retCode === 0 && priceResponse.result.list && 
                    priceResponse.result.list.length > 0) {
                  const ticker = priceResponse.result.list[0];
                  coinPriceMap[coinName] = parseFloat(ticker.lastPrice);
                  console.log(`Price for ${coinName}: $${coinPriceMap[coinName]}`);
                } else {
                  console.warn(`Could not get price for ${coinName}`);
                  coinPriceMap[coinName] = 0;
                }
              })
              .catch(error => {
                console.error(`Error getting price for ${coinName}:`, error);
                coinPriceMap[coinName] = 0;
              })
          );
        } else if (coinName === 'USDT' || coinName === 'USDC' || coinName === 'USD') {
          // Stablecoins are worth $1
          coinPriceMap[coinName] = 1;
        }
      }
    }
    
    // Wait for all price requests to complete
    if (pricePromises.length > 0) {
      await Promise.all(pricePromises);
    }
    
    // Now calculate USD values for all assets
    if (fundAccount.balance && Array.isArray(fundAccount.balance)) {
      fundAccount.balance.forEach(coin => {
        const coinName = coin.coin;
        const walletBalance = parseFloat(coin.walletBalance) || 0;
        const transferBalance = parseFloat(coin.transferBalance) || 0;
        const coinPrice = coinPriceMap[coinName] || 0;
        const usdValue = walletBalance * coinPrice;
        
        totalUsdValue += usdValue;
        
        if (walletBalance > 0) {
          assets.push({
            coin: coinName,
            walletBalance,
            transferBalance,
            coinPrice,
            usdValue,
            source: 'Funding Account'
          });
        }
      });
    }
    
    // Sort assets by USD value (highest first)
    assets.sort((a, b) => b.usdValue - a.usdValue);
    
    return {
      success: true,
      assets,
      totalUsdValue,
      rawData: {
        fundAccount
      },
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error in getFundingAccountBalance:', error);
    throw error;
  }
}

/**
 * Get transaction history
 * @param {Object} params - Optional parameters like limit, coin, etc.
 * @returns {Promise<Object>} - Transaction history
 */
export async function getTransactionHistory(params = {}) {
  const defaultParams = {
    limit: '50'
  };
  
  const queryParams = { ...defaultParams, ...params };
  return makeSignedRequest('/v5/asset/exchange/order-record', 'GET', queryParams);
}

/**
 * Get deposit records
 * @param {Object} params - Optional parameters
 * @returns {Promise<Object>} - Deposit records
 */
export async function getDepositRecords(params = {}) {
  const defaultParams = {
    limit: '50'
  };
  
  const queryParams = { ...defaultParams, ...params };
  return makeSignedRequest('/v5/asset/deposit/query-record', 'GET', queryParams);
}

/**
 * Get withdrawal records
 * @param {Object} params - Optional parameters
 * @returns {Promise<Object>} - Withdrawal records
 */
export async function getWithdrawalRecords(params = {}) {
  const defaultParams = {
    limit: '50'
  };
  
  const queryParams = { ...defaultParams, ...params };
  return makeSignedRequest('/v5/asset/withdraw/query-record', 'GET', queryParams);
}
