// src/index.js
import './core/loadEnv.js';
import { createServer } from './core/server.js';

// Create and start the server
const server = createServer();
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
  🚀 Server is running
  📡 Endpoint: http://localhost:${PORT}
  📋 Available routes:
  - GET /api/bybit/balance
  - GET /api/bybit/formatted
  `);
});
