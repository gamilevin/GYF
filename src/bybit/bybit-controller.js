// src/bybit/bybit-controller.js
import { 
  getAccountValue, 
  formatAccountValue, 
  testApiConnection,
  debugApiConnection
} from './bybit-api.js';

/**
 * Get Bybit account balance
 */
export async function getBalanceHandler(req, res) {
  try {
    const data = await getAccountValue();
    res.json(data);
  } catch (error) {
    console.error('Error in getBalanceHandler:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get formatted Bybit account balance
 */
export async function getFormattedBalanceHandler(req, res) {
  try {
    const data = await getAccountValue();
    const formatted = formatAccountValue(data);
    res.type('text/plain').send(formatted);
  } catch (error) {
    console.error('Error in getFormattedBalanceHandler:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Test Bybit API connection
 */
export async function testConnectionHandler(req, res) {
  try {
    const result = await testApiConnection();
    res.json(result);
  } catch (error) {
    console.error('Error in testConnectionHandler:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Debug Bybit API connection
 */
export async function debugConnectionHandler(req, res) {
  try {
    const result = await debugApiConnection();
    res.json(result);
  } catch (error) {
    console.error('Error in debugConnectionHandler:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}