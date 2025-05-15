// src/core/loadEnv.js
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the root directory (.env is typically in the project root)
const rootDir = resolve(__dirname, '../..');
const envPath = resolve(rootDir, '.env');

// Load environment variables
console.log(`Looking for .env file at: ${envPath}`);

if (fs.existsSync(envPath)) {
  console.log(`✅ Found .env file at ${envPath}`);
  
  // Load environment variables from .env file
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.error('❌ Error loading .env file:', result.error);
  } else {
    console.log('✅ Successfully loaded environment variables from .env file');
    
    // Check critical environment variables
    const criticalVars = ['BYBIT_API_KEY', 'BYBIT_API_SECRET'];
    const missingVars = criticalVars.filter(v => !process.env[v]);
    
    if (missingVars.length > 0) {
      console.warn(`⚠️ Missing critical environment variables: ${missingVars.join(', ')}`);
    } else {
      console.log('✅ All critical environment variables are set');
    }
  }
} else {
  console.error('❌ No .env file found at', envPath);
  console.error('Please create a .env file with required environment variables');
}

// Export loaded env variables
export default process.env;
