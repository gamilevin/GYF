// src/bybit/client.js
import crypto from 'crypto';
import axios from 'axios';

// Get API credentials from environment variables
const API_KEY = process.env.BYBIT_API_KEY;
const API_SECRET = process.env.BYBIT_API_SECRET;
const BASE_URL = 'https://api.bybit.com';

// Validate credentials
if (!API_KEY || !API_SECRET) {
  throw new Error('Missing BYBIT_API_KEY or BYBIT_API_SECRET environment variables!');
}

/**
 * Generate signature for ByBit API request
 * @param {String} timestamp - Current timestamp in milliseconds
 * @param {String} method - HTTP method (GET, POST)
 * @param {String} path - API endpoint path
 * @param {Object} params - Request parameters
 * @returns {Object} - Query string and signature
 */
function generateSignature(timestamp, method, path, params = {}) {
  // Create a copy of params to avoid modifying the original
  const paramsWithAuth = { ...params };
  
  // Add authentication parameters
  paramsWithAuth.api_key = API_KEY;
  paramsWithAuth.timestamp = timestamp;
  paramsWithAuth.recv_window = '5000';
  
  // Sort parameters alphabetically by key as required by ByBit
  const sortedParams = {};
  Object.keys(paramsWithAuth).sort().forEach(key => {
    sortedParams[key] = paramsWithAuth[key];
  });
  
  // Build query string
  const queryString = Object.entries(sortedParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  
  // Generate HMAC SHA256 signature
  const signature = crypto
    .createHmac('sha256', API_SECRET)
    .update(queryString)
    .digest('hex');
  
  return { queryString, signature };
}

/**
 * Make a signed request to ByBit API
 * @param {String} path - API endpoint path
 * @param {String} method - HTTP method (GET, POST)
 * @param {Object} params - Request parameters
 * @returns {Promise<Object>} - API response
 */
export async function makeSignedRequest(path, method = 'GET', params = {}) {
  try {
    const timestamp = Date.now().toString();
    
    // Generate signature
    const { queryString, signature } = generateSignature(timestamp, method, path, params);
    
    // Final query string with signature
    const finalQueryString = `${queryString}&sign=${signature}`;
    
    // Construct URL
    const url = `${BASE_URL}${path}?${finalQueryString}`;
    
    console.log(`Making ${method} request to: ${path}`);
    
    // Make the request
    const response = await axios({
      method,
      url,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('API request error:', {
      message: error.message,
      path,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
}
