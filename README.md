# OpenCart-ONDC Adaptor


A Node.js based adaptor that enables OpenCart e-commerce stores to integrate with the Open Network for Digital Commerce (ONDC) network in India. This adaptor implements the ONDC protocol specifications and handles all necessary API interactions between OpenCart and the ONDC network.

## Core Capabilities

### Protocol Implementation
- Complete ONDC protocol implementation
- Bidirectional API support (Buyer & Seller flows)
- Real-time order status synchronization
- Secure cryptographic signing of requests
- Registry integration for participant verification

### Supported ONDC APIs
- Search & Discovery (`/search`, `/on_search`)
- Product Selection (`/select`, `/on_select`)
- Order Initialization (`/init`, `/on_init`)
- Order Confirmation (`/confirm`, `/on_confirm`)
- Order Cancellation (`/cancel`, `/on_cancel`)
- Order Updates (`/update`, `/on_update`)
- Status Checking (`/status`, `/on_status`)
- Issue Management (`/issue`, `/on_issue`, `/issue_status`, `/on_issue_status`)
<!-- - Order Tracking (`/track`, `/on_track`) -->


## Project Structure

```
├── auth/                # Authentication & cryptographic utilities
├── config/              # Configuration files and mappings
├── handlers/            # API request handlers
├── middlewares/         # Express middlewares
├── routes/              # API route definitions
├── schemas/             # JSON schemas for validation
├── services/            # Business logic services
└── utils/               # Helper utilities
```

## Prerequisites

- Node.js (LTS version)
- OpenCart installation
- ONDC Network Subscription
- Valid ONDC Registry credentials

## Installation

1. Clone this repository:
```bash
git clone [repository-url]
cd opencart-adaptor
```

2. Install dependencies:
```bash
npm install
```

3. Update the .env file with your credentials:
```env
PORT=                    # Server port (default: 3000)
OPENCART_URL=            # Your OpenCart store URL
OPENCART_API_KEY=        # OpenCart API key
ONDC_SUBSCRIPTION_ID=    # Your ONDC subscriber/subscription ID
ONDC_SIGNING_PRIVATE_KEY=# Your ONDC signing private key
ONDC_REGISTRY_URL=       # ONDC registry URL
ONDC_AUTH_TOKEN=         # ONDC authentication token
```

## Starting the Server

```bash
npm start
```

## API Documentation

### Core APIs

#### Search Flow
- POST `/api/search`: Search for products
- POST `/api/on_search`: Handle search results

#### Order Flow
- POST `/api/select`: Select items for purchase
- POST `/api/init`: Initialize order
- POST `/api/confirm`: Confirm order

#### Status & Updates
- POST `/api/status`: Check order status
- POST `/api/on_status`: Receive status updates
- POST `/api/update`: Update order details
- POST `/api/on_update`: Handle order updates

<!-- #### Order Tracking
- POST `/api/track`: Track order delivery
- POST `/api/on_track`: Receive tracking updates -->

#### Issue Resolution
- POST `/api/issue`: Create new issue
- POST `/api/issue_status`: Check issue status
- POST `/api/on_issue`: Handle issue updates
- POST `/api/on_issue_status`: Receive issue status updates

### Order Status Tracking

The adaptor supports the following order states:
- RECEIVED: Initial order receipt
- PROCESSING: Order under processing
- ACCEPTED: Order accepted by seller
- CONFIRMED: Order confirmed
- SHIPPED: Order dispatched
- DELIVERED: Order delivered
- CANCELLED: Order cancelled
- COMPLETED: Order fulfillment complete

## Security Features

### Authentication
- ED25519 based request signing
- Request signature verification
- Registry-based participant verification
- Rate limiting on all endpoints

### Data Protection
- Secure key storage
- Request/Response encryption
- Payload integrity verification

## Error Handling

The adaptor implements comprehensive error management:
- Protocol violations
- Network failures
- Authentication errors
- Data validation errors
- OpenCart API errors

## Logging

- Request/Response logging
- Error logging
- Security event logging
- Performance metrics

## Configuration

### Required Environment Variables
```env
# ONDC Registry Configuration
ONDC_REGISTRY_URL=       # ONDC registry URL
ONDC_SUBSCRIPTION_ID=    # Your ONDC subscriber/subscription ID
ONDC_UK_ID=             # Your ONDC unique key ID
ONDC_AUTH_TOKEN=        # ONDC authentication token

# ONDC Cryptographic Keys
ONDC_SIGNING_PUBLIC_KEY=     # Your ONDC signing public key
ONDC_SIGNING_PRIVATE_KEY=    # Your ONDC signing private key
ONDC_ENCRYPTION_PUBLIC_KEY=  # Your ONDC encryption public key
ONDC_ENCRYPTION_PRIVATE_KEY= # Your ONDC encryption private key

# OpenCart Configuration
OPENCART_SITE=          # OpenCart site URL
OPENCART_USERNAME=      # OpenCart admin username
OPENCART_KEY=           # OpenCart API key
ADAPTOR_SITE=          # Adaptor site URL
API_TOKEN=             # API authentication token

# Database Configuration
DB_HOST=               # Database host
DB_USER=               # Database username
DB_PASS=               # Database password
DB_NAME=               # Database name
```

### Optional Environment Variables
```env
# ONDC Network Configuration
ONDC_DOMAIN=           # ONDC domain (default from ondcConfig.js)
ONDC_COUNTRY=          # Country code (default from ondcConfig.js)
ONDC_CITY=             # City code (default from ondcConfig.js)

# Server Configuration
PORT=                  # Server port (default: 3000)
```

All optional variables have default values defined in `config/ondcConfig.js`.


<!-- ## License -->
