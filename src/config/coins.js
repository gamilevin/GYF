// src/config/coins.js

/**
 * Configuration file for cryptocurrency coins
 * Add or remove coins from this list to customize which coins are checked
 */

export const COINS_CONFIG = {
  // Stablecoins
  stablecoins: [
    'USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP', 'USDD', 'FDUSD'
  ],
  
  // Major cryptocurrencies
  major: [
    'BTC', 'ETH', 'XRP', 'SOL', 'BNB', 'ADA', 'DOGE', 'DOT', 'AVAX'
  ],
  
  // Mid-cap cryptocurrencies
  midCap: [
    'SHIB', 'MATIC', 'LTC', 'LINK', 'UNI', 'TRX', 'ATOM', 'EOS', 'FIL',
    'NEAR', 'TON', 'BCH', 'XMR', 'INJ', 'HBAR', 'SUI'
  ],
  
  // Special interest coins (add your specific coins here)
  special: [
    'XLM', 'PEPE', 'AMI', 'BBSOL', 'APE', 'IMX', 'ID', 'OP', 'FET',
    'GRT', 'ARB', 'RNDR', 'FTM', 'THETA', 'BONK', 'WLD', 'ICP', 'XLM', 'ALGO'
  ],
  
  // Alternative names for some coins (useful for exchanges that use different tickers)
  alternativeNames: {
    'XLM': ['STELLAR', 'XLM'],
    'DOGE': ['DOGE', 'DOGECOIN'],
    'BTC': ['BTC', 'BITCOIN']
  },
  
  // Default fallback prices for coins that might not have market data
  defaultPrices: {
    'BTC': 60000,
    'ETH': 3000,
    'XRP': 2.42,
    'SOL': 125,
    'BNB': 400,
    'ADA': 0.5,
    'DOGE': 0.15,
    'DOT': 6.5,
    'AVAX': 30,
    'PEPE': 0.0000144,
    'AMI': 0.05,
    'SHIB': 0.00002,
    'XLM': 0.15,
    'HBAR': 0.08,
    'SUI': 1.20,
    'BBSOL': 30.0
  },
  
  // Earn products configuration
  earn: {
    // Earning product categories
    categories: ['REGULAR', 'DEFI', 'LAUNCHPOOL', 'LIQUIDITYPOOL'],
    
    // Status of products to include in total value
    includedStatuses: ['ONGOING', 'REDEEMED', 'REDEMPTION_PENDING']
  }
};

// Get all coins from configuration
export function getAllConfiguredCoins() {
  const allCoins = [
    ...COINS_CONFIG.stablecoins,
    ...COINS_CONFIG.major,
    ...COINS_CONFIG.midCap,
    ...COINS_CONFIG.special
  ];
  
  // Add alternative names
  Object.values(COINS_CONFIG.alternativeNames).forEach(alternatives => {
    alternatives.forEach(alt => {
      if (!allCoins.includes(alt)) {
        allCoins.push(alt);
      }
    });
  });
  
  return allCoins;
}

// Get default price for a coin
export function getDefaultPrice(coin) {
  return COINS_CONFIG.defaultPrices[coin] || 0;
}