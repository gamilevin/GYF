// src/bybit/bybit-api.js
import axios from 'axios';
import crypto from 'crypto';
import 'dotenv/config';
import { getAllConfiguredCoins, getDefaultPrice, COINS_CONFIG } from '../config/coins.js';
import { EARN_PRODUCTS, getManualEarnValue } from '../config/earn.js';

// API credentials from environment variables
const API_KEY = process.env.BYBIT_API_KEY;
const API_SECRET = process.env.BYBIT_API_SECRET;

// Base URL for Bybit API
const BASE_URL = 'https://api.bybit.com';

/**
 * Generate signature for Bybit API authentication (V5)
 */
function getSignature(timestamp, recvWindow, params = {}) {
  // Create the string to sign
  let signString = timestamp + API_KEY + recvWindow;
  
  // Add sorted query parameters to the string
  const sortedParams = {};
  Object.keys(params).sort().forEach(key => {
    sortedParams[key] = params[key];
  });
  
  // Add parameters to sign string
  if (Object.keys(sortedParams).length > 0) {
    const queryString = new URLSearchParams(sortedParams).toString();
    signString += queryString;
  }
  
  // Create HMAC signature with SHA256
  return crypto
    .createHmac('sha256', API_SECRET)
    .update(signString)
    .digest('hex');
}

/**
 * Make authenticated request to Bybit API (V5)
 */
async function makeAuthRequest(endpoint, method = 'GET', params = {}) {
  try {
    const timestamp = Date.now().toString();
    const recvWindow = '5000';
    
    // Generate signature
    const signature = getSignature(timestamp, recvWindow, params);
    
    // Build request options
    let url = `${BASE_URL}${endpoint}`;
    let requestConfig = {
      method,
      headers: {
        'X-BAPI-API-KEY': API_KEY,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-RECV-WINDOW': recvWindow
      }
    };
    
    // Add parameters to request
    if (method === 'GET' && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    } else if (method === 'POST') {
      requestConfig.data = params;
      requestConfig.headers['Content-Type'] = 'application/json';
    }
    
    // Set final URL
    requestConfig.url = url;
    
    console.log(`Making ${method} request to ${endpoint}`);
    const response = await axios(requestConfig);
    
    // Check response
    if (response.data && response.data.retCode === 0) {
      console.log(`Response from ${endpoint}:`, JSON.stringify(response.data.result).substring(0, 200) + '...');
      return response.data.result;
    } else {
      console.error('API Error:', response.data);
      throw new Error(response.data?.retMsg || 'Unknown error');
    }
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Make V3 authenticated request with proper formatting
 */
async function makeV3Request(endpoint, params = {}) {
  try {
    const timestamp = Date.now().toString();
    
    // Add API key to params
    const allParams = {
      api_key: API_KEY,
      timestamp,
      ...params
    };
    
    // Convert params to query string for signature
    let queryString = '';
    Object.keys(allParams).sort().forEach(key => {
      queryString += key + '=' + allParams[key] + '&';
    });
    
    // Remove trailing &
    queryString = queryString.slice(0, -1);
    
    // Generate signature for v3 API
    const signature = crypto
      .createHmac('sha256', API_SECRET)
      .update(queryString)
      .digest('hex');
    
    // Add signature to params
    allParams.sign = signature;
    
    // Make request
    console.log(`Making V3 request to ${endpoint}`);
    
    // Create proper URL formatting
    const url = `${BASE_URL}${endpoint}`;
    
    const response = await axios({
      method: 'GET',
      url,
      params: allParams
    });
    
    if (response.data && (response.data.ret_code === 0 || response.data.code === 0)) {
      console.log(`V3 Response from ${endpoint}:`, JSON.stringify(response.data.result || response.data.data).substring(0, 200) + '...');
      return response.data.result || response.data.data;
    } else {
      console.error('V3 API Error:', response.data);
      throw new Error(response.data?.ret_msg || response.data?.message || 'Unknown error');
    }
  } catch (error) {
    console.error(`Error making V3 request to ${endpoint}:`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Get all available coins from Bybit
 */
async function getAvailableCoins() {
  try {
    // Try to get all available coins from Bybit
    const response = await axios.get(`${BASE_URL}/v5/asset/coin/query-info`);
    
    const availableCoins = [];
    
    if (response.data && response.data.retCode === 0 && response.data.result.rows) {
      for (const coin of response.data.result.rows) {
        if (coin.name && !availableCoins.includes(coin.name)) {
          availableCoins.push(coin.name);
        }
      }
    }
    
    console.log(`Got ${availableCoins.length} available coins from Bybit`);
    return availableCoins;
  } catch (error) {
    console.error('Error getting available coins:', error.message);
    return []; // Return empty array on error
  }
}

/**
 * Get all coins to check
 */
async function getAllCoinsToCheck() {
  try {
    // Get configured coins from config file
    const configuredCoins = getAllConfiguredCoins();
    
    // Get coins from Bybit API
    const apiCoins = await getAvailableCoins();
    
    // Combine all sources, removing duplicates
    const allCoins = [...new Set([...configuredCoins, ...apiCoins])];
    
    console.log(`Will check ${allCoins.length} coins in total`);
    return allCoins;
  } catch (error) {
    console.error('Error getting coins to check:', error.message);
    // Fallback to configured coins
    return getAllConfiguredCoins();
  }
}

/**
 * Get current market prices for coins
 */
async function getCoinPrices() {
  try {
    console.log('Fetching current market prices');
    const response = await axios.get(`${BASE_URL}/v5/market/tickers`, {
      params: { category: 'spot' }
    });
    
    const prices = {};
    
    if (response.data && response.data.retCode === 0 && response.data.result.list) {
      console.log(`Got ${response.data.result.list.length} tickers from Bybit`);
      
      for (const ticker of response.data.result.list) {
        // Extract coin and price for USD pairs
        if (ticker.symbol.endsWith('USDT')) {
          const coin = ticker.symbol.replace('USDT', '');
          prices[coin] = parseFloat(ticker.lastPrice);
          
          // Debug for special coins
          const specialCoins = [...COINS_CONFIG.special, ...COINS_CONFIG.major];
          if (specialCoins.includes(coin)) {
            console.log(`Found price for ${coin}: ${ticker.lastPrice}`);
          }
        }
      }
    }
    
    // Add stable coins
    for (const stablecoin of COINS_CONFIG.stablecoins) {
      prices[stablecoin] = 1;
    }
    
    // Add default prices for coins not found
    for (const coin in COINS_CONFIG.defaultPrices) {
      if (!prices[coin]) {
        prices[coin] = COINS_CONFIG.defaultPrices[coin];
        console.log(`Using default price for ${coin}: ${prices[coin]}`);
      }
    }
    
    // Handle alternative names
    for (const [primaryCoin, alternatives] of Object.entries(COINS_CONFIG.alternativeNames)) {
      if (prices[primaryCoin]) {
        for (const altCoin of alternatives) {
          if (!prices[altCoin]) {
            prices[altCoin] = prices[primaryCoin];
          }
        }
      }
    }
    
    console.log('Fetched prices for coins:', Object.keys(prices).length);
    return prices;
  } catch (error) {
    console.error('Error fetching coin prices:', error.message);
    
    // Return default prices as fallback
    const defaultPrices = {};
    
    // Add all configured default prices
    for (const coin in COINS_CONFIG.defaultPrices) {
      defaultPrices[coin] = COINS_CONFIG.defaultPrices[coin];
    }
    
    // Add stable coins
    for (const stablecoin of COINS_CONFIG.stablecoins) {
      defaultPrices[stablecoin] = 1;
    }
    
    return defaultPrices;
  }
}

/**
 * Try to get earning products using V5 API
 */
async function getEarningProductsV5() {
  try {
    console.log('Fetching earning products using V5 API...');
    
    // Try multiple endpoints to find Earn products
    
    // 1. First try the earning history endpoint
    try {
      console.log('Trying earning history endpoint...');
      const history = await makeAuthRequest('/v5/asset/earning/history', 'GET', {
        limit: 100
      });
      
      if (history && history.list && history.list.length > 0) {
        console.log(`Found ${history.list.length} earning history entries`);
        
        // Filter active investments
        const activeInvestments = history.list.filter(product => 
          COINS_CONFIG.earn.includedStatuses.includes(product.status)
        );
        
        console.log(`Found ${activeInvestments.length} active investments`);
        
        if (activeInvestments.length > 0) {
          return {
            products: activeInvestments,
            total: history.list.length,
            source: 'earning/history'
          };
        }
      } else {
        console.log('No earning history found or empty response');
      }
    } catch (error) {
      console.error('Error with earning history endpoint:', error.message);
    }
    
    // 2. Try earning records endpoint
    try {
      console.log('Trying earning records endpoint...');
      const records = await makeAuthRequest('/v5/asset/earning/records', 'GET', {
        limit: 100
      });
      
      if (records && records.list && records.list.length > 0) {
        console.log(`Found ${records.list.length} earning records`);
        return {
          products: records.list,
          total: records.list.length,
          source: 'earning/records'
        };
      } else {
        console.log('No earning records found or empty response');
      }
    } catch (error) {
      console.error('Error with earning records endpoint:', error.message);
    }
    
    // 3. Try product list endpoint
    try {
      console.log('Trying earning product list endpoint...');
      const productList = await makeAuthRequest('/v5/asset/earning/product-list', 'GET', {
        limit: 100
      });
      
      if (productList && productList.list && productList.list.length > 0) {
        console.log(`Found ${productList.list.length} products in list`);
        // Filter to only products user is invested in
        const investedProducts = productList.list.filter(product => 
          product.investAmount && parseFloat(product.investAmount) > 0
        );
        
        console.log(`Found ${investedProducts.length} invested products`);
        
        if (investedProducts.length > 0) {
          return {
            products: investedProducts,
            total: productList.list.length,
            source: 'earning/product-list'
          };
        }
      } else {
        console.log('No product list found or empty response');
      }
    } catch (error) {
      console.error('Error with product list endpoint:', error.message);
    }
    
    console.log('No earning products found in V5 API');
    return { products: [] };
  } catch (error) {
    console.error('Error fetching earning products from V5 API:', error.message);
    return { products: [] };
  }
}

/**
 * Get active earning products investments using V3 API
 */
async function getEarningProductsV3() {
  try {
    console.log('Fetching earning products using V3 API...');
    
    // Try multiple V3 endpoints to find Earn products
    
    // 1. Try the wallet fund/records endpoint
    try {
      console.log('Trying V3 wallet fund/records endpoint...');
      const fundRecords = await makeV3Request('/v2/private/wallet/fund/records', {
        limit: 50
      });
      
      if (fundRecords && fundRecords.data && fundRecords.data.length > 0) {
        console.log(`Found ${fundRecords.data.length} fund records in V3 API`);
        
        // Look for Earn-related records
        const earnRecords = fundRecords.data.filter(record => 
          record.type === 'Earn' || 
          record.type === 'STAKING' || 
          record.type === 'SAVINGS'
        );
        
        if (earnRecords.length > 0) {
          console.log(`Found ${earnRecords.length} Earn-related records in fund records`);
          return {
            products: earnRecords,
            total: earnRecords.length,
            source: 'v3/wallet/fund/records'
          };
        }
      }
    } catch (error) {
      console.error('Error with V3 fund records endpoint:', error.message);
    }
    
    // 2. Try the V3 wallet endpoint for comprehensive data
    try {
      console.log('Trying V3 wallet endpoint for comprehensive data...');
      const walletBalance = await makeV3Request('/v2/private/wallet/balance', {});
      
      console.log('V3 wallet balance response keys:', JSON.stringify(Object.keys(walletBalance || {})));
      
      if (walletBalance) {
        // The wallet balance has info on all coins
        const coinsWithBalance = Object.keys(walletBalance).filter(coin => {
          const coinData = walletBalance[coin];
          return coinData && (
            (coinData.equity && parseFloat(coinData.equity) > 0) || 
            (coinData.wallet_balance && parseFloat(coinData.wallet_balance) > 0)
          );
        });
        
        console.log(`Found ${coinsWithBalance.length} coins with balance in wallet`);
        
        if (coinsWithBalance.length > 0) {
          // Create products from wallet data
          const products = [];
          
          for (const coin of coinsWithBalance) {
            const coinData = walletBalance[coin];
            
            // Check if there's a difference between wallet_balance and available_balance
            // which could indicate staked/locked funds
            const walletBalance = parseFloat(coinData.wallet_balance || 0);
            const availableBalance = parseFloat(coinData.available_balance || 0);
            const stakedAmount = walletBalance - availableBalance;
            
            if (stakedAmount > 0) {
              console.log(`Found potential staked ${coin}: ${stakedAmount}`);
              products.push({
                coin,
                amount: stakedAmount,
                type: 'STAKED',
                name: `${coin} Staking`
              });
            }
          }
          
          if (products.length > 0) {
            console.log(`Found ${products.length} potential staked products in wallet`);
            return {
              products,
              total: products.length,
              source: 'v3/wallet/balance'
            };
          }
        }
      }
    } catch (error) {
      console.error('Error with V3 wallet endpoint:', error.message);
    }
    
    // 3. Try Earn order record endpoint
    try {
      console.log('Trying V3 earn order-record endpoint...');
      const earnOrders = await makeV3Request('/v2/earn/order-record', {
        limit: 50
      });
      
      if (earnOrders && earnOrders.data && earnOrders.data.length > 0) {
        console.log(`Found ${earnOrders.data.length} earn orders`);
        
        // Filter active orders
        const activeOrders = earnOrders.data.filter(order => 
          order.status === 'ACTIVE' || 
          order.status === 'ONGOING' || 
          order.status === 'STAKING'
        );
        
        if (activeOrders.length > 0) {
          console.log(`Found ${activeOrders.length} active earn orders`);
          return {
            products: activeOrders,
            total: activeOrders.length,
            source: 'v3/earn/order-record'
          };
        }
      }
    } catch (error) {
      console.error('Error with V3 earn order-record endpoint:', error.message);
    }
    
    console.log('No earning products found in V3 API');
    return { products: [] };
  } catch (error) {
    console.error('Error fetching earning products from V3 API:', error.message);
    return { products: [] };
  }
}

/**
 * Get total value of earn products
 */
async function getEarnProductsValue() {
  try {
    // Get coin prices for value calculation
    const coinPrices = await getCoinPrices();
    
    console.log('Checking for manual earn configuration...');
    
    // Use the directly imported EARN_PRODUCTS
    if (EARN_PRODUCTS && EARN_PRODUCTS.length > 0) {
      console.log(`Found ${EARN_PRODUCTS.length} manually configured earn products`);
      
      // Calculate values using imported function
      const manualEarnData = getManualEarnValue(coinPrices);
      
      console.log(`Calculated total value of earn products: $${manualEarnData.totalValueUSD}`);
      
      // Log each product for debugging
      for (const product of manualEarnData.earnProducts) {
        console.log(`Manual Earn product: ${product.coin} - ${product.amount} × $${product.price} = $${product.valueUSD.toFixed(2)}`);
      }
      
      return manualEarnData;
    }
    
    console.log('No manual earn configuration or empty, trying API methods...');
    
    // ... rest of the function to try API methods ...
    
    // If nothing found, return empty
    console.log('No earn products found through any method');
    return {
      earnProducts: [],
      totalValueUSD: 0
    };
  } catch (error) {
    console.error('Error getting earn products value:', error.message);
    return {
      earnProducts: [],
      totalValueUSD: 0
    };
  }
}

/**
 * Get all coin balances from FUND account with accurate market prices
 */
async function getAllCoinBalances() {
  try {
    // Get current market prices
    const coinPrices = await getCoinPrices();
    
    // Get all coins to check
    const allCoins = await getAllCoinsToCheck();
    console.log(`Checking balances for ${allCoins.length} coins`);
    
    const results = {};
    let totalUSD = 0;
    
    // Check balance for special interest coins first
    for (const coin of COINS_CONFIG.special) {
      try {
        const response = await makeAuthRequest('/v5/asset/transfer/query-account-coin-balance', 'GET', {
          accountType: 'FUND',
          coin
        });
        
        if (response && response.balance && parseFloat(response.balance.walletBalance) > 0) {
          // Add price info to the result
          const price = coinPrices[coin] || getDefaultPrice(coin);
          response.balance.priceUSD = price;
          results[coin] = response.balance;
          
          // Parse balance amounts
          const walletBalance = parseFloat(response.balance.walletBalance || 0);
          
          // Calculate USD value using current price
          const usdValue = walletBalance * price;
          
          if (usdValue > 0) {
            totalUSD += usdValue;
            console.log(`${coin} balance: ${walletBalance} × $${price} = $${usdValue.toFixed(2)}`);
          }
        }
      } catch (error) {
        // Skip coins that return errors
        console.error(`Error getting ${coin} balance:`, error.message);
        
        // Try alternative names if available
        const altNames = COINS_CONFIG.alternativeNames[coin];
        if (altNames) {
          for (const altName of altNames) {
            if (altName === coin) continue; // Skip the primary name
            
            try {
              const altResponse = await makeAuthRequest('/v5/asset/transfer/query-account-coin-balance', 'GET', {
                accountType: 'FUND',
                coin: altName
              });
              
              if (altResponse && altResponse.balance && parseFloat(altResponse.balance.walletBalance) > 0) {
                const price = coinPrices[altName] || coinPrices[coin] || getDefaultPrice(coin);
                altResponse.balance.priceUSD = price;
                results[altName] = altResponse.balance;
                
                const walletBalance = parseFloat(altResponse.balance.walletBalance || 0);
                const usdValue = walletBalance * price;
                
                if (usdValue > 0) {
                  totalUSD += usdValue;
                  console.log(`${altName} balance: ${walletBalance} × $${price} = $${usdValue.toFixed(2)}`);
                }
                
                // Found using alternative name, no need to try others
                break;
              }
            } catch (altError) {
              console.error(`Error getting ${altName} balance:`, altError.message);
            }
          }
        }
      }
    }
    
    // Check balance for other coins
    for (const coin of allCoins) {
      // Skip special interest coins since we already checked them
      if (COINS_CONFIG.special.includes(coin)) continue;
      
      // Skip alternative names that are not primary coins
      let isPrimaryOrNotAlt = true;
      for (const [primary, alternatives] of Object.entries(COINS_CONFIG.alternativeNames)) {
        if (alternatives.includes(coin) && coin !== primary) {
          isPrimaryOrNotAlt = false;
          break;
        }
      }
      if (!isPrimaryOrNotAlt) continue;
      
      try {
        const response = await makeAuthRequest('/v5/asset/transfer/query-account-coin-balance', 'GET', {
          accountType: 'FUND',
          coin
        });
        
        if (response && response.balance && parseFloat(response.balance.walletBalance) > 0) {
          // Add price info to the result
          const price = coinPrices[coin] || getDefaultPrice(coin);
          response.balance.priceUSD = price;
          results[coin] = response.balance;
          
          // Parse balance amounts
          const walletBalance = parseFloat(response.balance.walletBalance || 0);
          
          // Calculate USD value using current price
          const usdValue = walletBalance * price;
          
          if (usdValue > 0) {
            totalUSD += usdValue;
            console.log(`${coin} balance: ${walletBalance} × $${price} = $${usdValue.toFixed(2)}`);
          }
        }
      } catch (error) {
        // Skip coins that return errors
        console.error(`Error getting ${coin} balance:`, error.message);
      }
    }
    
    return {
      coinBalances: results,
      coinPrices,
      totalUSD
    };
  } catch (error) {
    console.error('Error getting all coin balances:', error.message);
    throw error;
  }
}

/**
 * Get account value with focus on FUND account balances and Earn products
 */
export async function getAccountValue() {
  try {
    // Get all coin balances from FUND account with market prices
    const balanceData = await getAllCoinBalances();
    
    // Get earn products value
    const earnData = await getEarnProductsValue();
    
    // Combine total values
    const totalValueUSD = balanceData.totalUSD + earnData.totalValueUSD;
    
    // Convert to GBP
    const usdToGbp = 0.78; // Example conversion rate - replace with real rate in production
    const totalValueGBP = totalValueUSD * usdToGbp;
    
    return {
      success: true,
      totalValueUSD,
      totalValueGBP,
      coinBalances: balanceData.coinBalances,
      coinPrices: balanceData.coinPrices,
      earnProducts: earnData.earnProducts,
      earnValueUSD: earnData.totalValueUSD,
      conversionRate: {
        usdToGbp
      },
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error getting account value:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Format account value data in a human-readable way
 */
export function formatAccountValue(data) {
  if (!data || !data.success) {
    return 'No account data available or error retrieving data.';
  }
  
  let output = '# Bybit Portfolio\n\n';
  
  // Add total values
  output += `## Total Portfolio Value: £${data.totalValueGBP.toFixed(2)} (${data.totalValueUSD.toFixed(2)} USD)\n\n`;
  
  // Add section breakdown (FUND + Earn)
  output += '## Account Breakdown\n\n';
  output += '| Account | Value (USD) | Value (GBP) | % of Total |\n';
  output += '|---------|-------------|-------------|------------|\n';
  
  const fundValueUSD = data.totalValueUSD - data.earnValueUSD;
  const fundValueGBP = fundValueUSD * data.conversionRate.usdToGbp;
  const earnValueGBP = data.earnValueUSD * data.conversionRate.usdToGbp;
  
  const fundPercentage = (fundValueUSD / data.totalValueUSD * 100).toFixed(2);
  const earnPercentage = (data.earnValueUSD / data.totalValueUSD * 100).toFixed(2);
  
  output += `| FUND Account | $${fundValueUSD.toFixed(2)} | £${fundValueGBP.toFixed(2)} | ${fundPercentage}% |\n`;
  output += `| Earn Products | $${data.earnValueUSD.toFixed(2)} | £${earnValueGBP.toFixed(2)} | ${earnPercentage}% |\n`;
  output += `| **Total** | **$${data.totalValueUSD.toFixed(2)}** | **£${data.totalValueGBP.toFixed(2)}** | **100.00%** |\n\n`;
  
  // Add Earn products section if available
  if (data.earnProducts && data.earnProducts.length > 0) {
    output += '## Invested Products (Earn)\n\n';
    output += '| Coin | Product | Amount | APY | Value (USD) | Value (GBP) |\n';
    output += '|------|---------|--------|-----|-------------|-------------|\n';
    
    // Sort earn products by value (highest first)
    const sortedProducts = [...data.earnProducts].sort((a, b) => b.valueUSD - a.valueUSD);
    
    for (const product of sortedProducts) {
      const valueGBP = product.valueUSD * data.conversionRate.usdToGbp;
      output += `| ${product.coin} | ${product.name} | ${product.amount.toFixed(6)} | ${product.apy} | $${product.valueUSD.toFixed(2)} | £${valueGBP.toFixed(2)} |\n`;
    }
    
    output += '\n';
  }
  
  // Add coin breakdown
  if (data.coinBalances) {
    output += '## FUND Account Coin Balances\n\n';
    output += '| Coin | Amount | Price (USD) | Value (USD) | Value (GBP) |\n';
    output += '|------|--------|-------------|-------------|-------------|\n';
    
    // Create array of coins for sorting
    const coinsArray = [];
    for (const coin in data.coinBalances) {
      const balance = data.coinBalances[coin];
      if (balance && parseFloat(balance.walletBalance) > 0) {
        const amount = parseFloat(balance.walletBalance);
        const price = parseFloat(balance.priceUSD || data.coinPrices[coin] || 0);
        const usdValue = amount * price;
        
        coinsArray.push({
          coin,
          amount,
          price,
          usdValue,
          gbpValue: usdValue * data.conversionRate.usdToGbp
        });
      }
    }
    
    // Sort by USD value (highest first)
    coinsArray.sort((a, b) => b.usdValue - a.usdValue);
    
    // Add rows to table
    for (const coinData of coinsArray) {
      // Format price with appropriate decimal places based on price magnitude
      let formattedPrice;
      if (coinData.price < 0.000001) {
        formattedPrice = coinData.price.toExponential(4);
      } else if (coinData.price < 0.001) {
        formattedPrice = coinData.price.toFixed(8);
      } else if (coinData.price < 1) {
        formattedPrice = coinData.price.toFixed(6);
      } else if (coinData.price < 1000) {
        formattedPrice = coinData.price.toFixed(2);
      } else {
        formattedPrice = Math.round(coinData.price).toString();
      }
      
      output += `| ${coinData.coin} | ${coinData.amount.toFixed(6)} | $${formattedPrice} | $${coinData.usdValue.toFixed(2)} | £${coinData.gbpValue.toFixed(2)} |\n`;
    }
    
    output += '\n';
  }
  
  // Add note about rate conversion
  output += `*Note: USD to GBP conversion rate used: ${data.conversionRate.usdToGbp}*\n\n`;
  
  return output;
}

/**
 * Debug API connection
 */
export async function debugApiConnection() {
  const results = {};
  
  try {
    // 1. Test basic connection
    try {
      const serverTime = await axios.get(`${BASE_URL}/v5/market/time`);
      results.serverTime = {
        success: true,
        data: serverTime.data
      };
    } catch (error) {
      results.serverTime = {
        success: false,
        error: error.message
      };
    }
    
    // 2. Check API key
    results.apiKeyCheck = {
      length: API_KEY ? API_KEY.length : 0,
      firstChars: API_KEY ? API_KEY.substring(0, 4) : null,
      lastChars: API_KEY ? API_KEY.substring(API_KEY.length - 4) : null
    };
    
    // 3. Test API key authentication
    try {
      const apiKeyInfo = await makeAuthRequest('/v5/user/query-api', 'GET');
      results.apiKeyInfo = {
        success: true,
        data: apiKeyInfo
      };
      
      // Check if API key has EARN permissions
      if (apiKeyInfo && apiKeyInfo.permissions) {
        results.earnPermission = {
          hasEarnPermission: apiKeyInfo.permissions.Earn && apiKeyInfo.permissions.Earn.includes('Earn'),
          permissions: apiKeyInfo.permissions
        };
      }
    } catch (error) {
      results.apiKeyInfo = {
        success: false,
        error: error.message
      };
    }
    
    // 4. Test configured coins
    results.configTest = {
      special: COINS_CONFIG.special,
      major: COINS_CONFIG.major,
      totalConfigured: getAllConfiguredCoins().length
    };
    
    // 5. Test special interest coins
    results.specialCoinsTest = {};
    
    for (const coin of COINS_CONFIG.special) {
      try {
        const balance = await makeAuthRequest('/v5/asset/transfer/query-account-coin-balance', 'GET', {
          accountType: 'FUND',
          coin
        });
        results.specialCoinsTest[coin] = {
          success: true,
          hasBalance: balance && balance.balance && parseFloat(balance.balance.walletBalance) > 0,
          balance: balance?.balance?.walletBalance || '0'
        };
      } catch (error) {
        results.specialCoinsTest[coin] = {
          success: false,
          error: error.message
        };
      }
    }
    
    // 6. Test V5 API earn endpoints
    try {
      console.log('Testing V5 API endpoints for earn products...');
      
      // Try each endpoint individually
      const v5Endpoints = [
        '/v5/asset/earning/history',
        '/v5/asset/earning/records',
        '/v5/asset/earning/product-list'
      ];
      
      results.v5EarnEndpointTests = {};
      
      for (const endpoint of v5Endpoints) {
        try {
          const response = await makeAuthRequest(endpoint, 'GET', {
            limit: 50
          });
          
          results.v5EarnEndpointTests[endpoint] = {
            success: true,
            hasData: response && ((response.list && response.list.length > 0) || (Array.isArray(response) && response.length > 0)),
            itemCount: response && response.list ? response.list.length : (Array.isArray(response) ? response.length : 0),
            sample: response && response.list ? response.list.slice(0, 2) : (Array.isArray(response) ? response.slice(0, 2) : response)
          };
        } catch (endpointError) {
          results.v5EarnEndpointTests[endpoint] = {
            success: false,
            error: endpointError.message
          };
        }
      }
    } catch (error) {
      results.v5EarnEndpointTests = {
        success: false,
        error: error.message
      };
    }
    
    // 7. Test V3 API endpoints for earn products
    try {
      console.log('Testing V3 API endpoints for earn products...');
      
      // Try V3 wallet endpoint
      try {
        const v3Wallet = await makeV3Request('/v2/private/wallet/balance', {});
        results.v3WalletTest = {
          success: true,
          coinCount: Object.keys(v3Wallet || {}).length,
          sampleCoins: Object.keys(v3Wallet || {}).slice(0, 5)
        };
      } catch (error) {
        results.v3WalletTest = {
          success: false,
          error: error.message
        };
      }
      
      // Try V3 earn order record
      try {
        const v3EarnOrders = await makeV3Request('/v2/earn/order-record', {
          limit: 50
        });
        results.v3EarnOrdersTest = {
          success: true,
          hasData: v3EarnOrders && Array.isArray(v3EarnOrders.data) && v3EarnOrders.data.length > 0,
          itemCount: v3EarnOrders && v3EarnOrders.data ? v3EarnOrders.data.length : 0,
          sample: v3EarnOrders && v3EarnOrders.data ? v3EarnOrders.data.slice(0, 2) : null
        };
      } catch (error) {
        results.v3EarnOrdersTest = {
          success: false,
          error: error.message
        };
      }
      
      // Try V3 fund records
      try {
        const v3FundRecords = await makeV3Request('/v2/private/wallet/fund/records', {
          limit: 50
        });
        results.v3FundRecordsTest = {
          success: true,
          hasData: v3FundRecords && Array.isArray(v3FundRecords.data) && v3FundRecords.data.length > 0,
          itemCount: v3FundRecords && v3FundRecords.data ? v3FundRecords.data.length : 0,
          sample: v3FundRecords && v3FundRecords.data ? v3FundRecords.data.slice(0, 2) : null
        };
      } catch (error) {
        results.v3FundRecordsTest = {
          success: false,
          error: error.message
        };
      }
    } catch (error) {
      results.v3ApiTest = {
        success: false,
        error: error.message
      };
    }
    
    // 8. Try to get the earn product values
    try {
      const earnProducts = await getEarnProductsValue();
      results.earnProductsValue = {
        success: true,
        totalValue: earnProducts.totalValueUSD,
        productCount: earnProducts.earnProducts ? earnProducts.earnProducts.length : 0,
        products: earnProducts.earnProducts ? earnProducts.earnProducts.slice(0, 3) : []
      };
    } catch (error) {
      results.earnProductsValue = {
        success: false,
        error: error.message
      };
    }
    
    return results;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test API connection
 */
export async function testApiConnection() {
  try {
    // Try to get server time (no auth required)
    const response = await axios.get(`${BASE_URL}/v5/market/time`);
    
    if (response.data && response.data.retCode === 0) {
      return {
        success: true,
        serverTime: response.data.result.timeSecond
      };
    } else {
      throw new Error(response.data?.retMsg || 'Unknown error');
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}