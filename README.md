@"
# GYF-Backend

Backend service for managing financial portfolio data across different platforms.

## Project Overview

This application integrates with various financial APIs to track portfolio balances, perform calculations, and provide a unified view of assets across platforms.

## Features

- Integration with ByBit API for retrieving account balances
- USD value conversion for cryptocurrencies
- Formatted and structured balance reports
- (Future) SQLite database for historical tracking
- (Future) Trading212 integration
- (Future) Web dashboard

## Architecture

The project follows a domain-based architecture, organizing code by feature rather than technical role:

- Each financial platform has its own domain (e.g., \`bybit/\`, \`trading212/\`)
- Core application concerns are separated into the \`core/\` directory
- Shared models are in the \`models/\` directory

## Setup

1. Clone the repository
2. Install dependencies: \`npm install\`
3. Create a \`.env\` file with required API keys: