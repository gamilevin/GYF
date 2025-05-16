// src/config/earn.js
/**
 * Configuration file for manually tracking Earn products on Bybit
 * Update this file whenever you stake or unstake assets
 */

export const EARN_PRODUCTS = [
  // Examples of actual Earn products
  {
    coin: 'USDC',                   // Bitcoin
    name: 'USDC', // Product name
    amount: 192.28,                  // 0.01 BTC staked
    apy: '6.33%',                   // Annual percentage yield
    type: 'FIXED'                  // Type: FLEXIBLE, FIXED, STAKING, etc.
  },
  {
    coin: 'HBAR',                    // Ethereum
    name: 'HBAR', // Product name
    amount: 2400.628,                    // 2.5 ETH staked
    apy: '0.8%',                    // Annual percentage yield
    type: 'FLEXIBLE'                // Type: FLEXIBLE, FIXED, STAKING, etc.
  },
  {
    coin: 'SUI',                   // Bitcoin
    name: 'SUI', // Product name
    amount: 26.61,                  // 0.01 BTC staked
    apy: '0.7%',                   // Annual percentage yield
    type: 'FIXED'                  // Type: FLEXIBLE, FIXED, STAKING, etc.
  },
  {
    coin: 'BTC',                   // Bitcoin
    name: 'BTC', // Product name
    amount: 0.09739774,                  // 0.01 BTC staked
    apy: '2.3%',                   // Annual percentage yield
    type: 'FIXED'                  // Type: FLEXIBLE, FIXED, STAKING, etc.
  },
  {
    coin: 'ETH',                   // Bitcoin
    name: 'ETH', // Product name
    amount: 0.23429390,                  // 0.01 BTC staked
    apy: '1%',                   // Annual percentage yield
    type: 'FIXED'                  // Type: FLEXIBLE, FIXED, STAKING, etc.
  },
  {
    coin: 'XRP',                   // Bitcoin
    name: 'XRP', // Product name
    amount: 5041.1,                  // 0.01 BTC staked
    apy: '0.7%',                   // Annual percentage yield
    type: 'FIXED'                  // Type: FLEXIBLE, FIXED, STAKING, etc.
  },
  {
    coin: 'SOL',                   // Bitcoin
    name: 'SOL', // Product name
    amount: 31.52675272,                  // 0.01 BTC staked
    apy: '0.8%',                   // Annual percentage yield
    type: 'FIXED'                  // Type: FLEXIBLE, FIXED, STAKING, etc.
  },
  {
    coin: 'CMETH',                   // Bitcoin
    name: 'CMETH', // Product name
    amount: 1.056636,                  // 0.01 BTC staked
    apy: '0.8%',                   // Annual percentage yield
    type: 'FIXED'                  // Type: FLEXIBLE, FIXED, STAKING, etc.
  },
  {
    coin: 'ADA',                   // Bitcoin
    name: 'ADA', // Product name
    amount: 11424.7844,                  // 0.01 BTC staked
    apy: '2.82%',                   // Annual percentage yield
    type: 'FIXED'                  // Type: FLEXIBLE, FIXED, STAKING, etc.
  }
  // Add your other Earn products below
  // {
  //   coin: 'DOT',
  //   name: 'Polkadot Staking',
  //   amount: 100,
  //   apy: '12.5%',
  //   type: 'STAKING'
  // },
];

/**
 * Get total value of manually tracked Earn products
 * @param {Object} coinPrices - Object with coin prices
 * @returns {Object} Total value and formatted products
 */
export function getManualEarnValue(coinPrices = {}) {
  let totalValueUSD = 0;
  const formattedProducts = [];
  
  for (const product of EARN_PRODUCTS) {
    const price = coinPrices[product.coin] || 0;
    const valueUSD = product.amount * price;
    
    if (valueUSD > 0) {
      totalValueUSD += valueUSD;
      
      formattedProducts.push({
        ...product,
        price,
        valueUSD,
        status: 'ONGOING'
      });
    }
  }
  
  return {
    earnProducts: formattedProducts,
    totalValueUSD
  };
}