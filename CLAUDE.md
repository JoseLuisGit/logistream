# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LogiStream is a microservices-based application demonstrating event-driven architecture with Node.js, TypeScript, Express, Kafka, and MongoDB. The project uses NPM Workspaces for monorepo management.

## Common Commands

### Infrastructure
```bash
# Start all infrastructure (Kafka, Zookeeper, MongoDB)
cd infra && docker-compose up -d

# Stop infrastructure
cd infra && docker-compose down
```

### Shared Library
```bash
# Build shared library (REQUIRED before starting services)
npm run build --workspace=@logistream/shared

# Watch mode for shared library development
npm run watch --workspace=@logistream/shared

# Clean shared library build
npm run clean --workspace=@logistream/shared
```

### Services
```bash
# Install all dependencies (root + all workspaces)
npm install

# Run a specific service in dev mode
cd services/auth && npm run dev
cd services/orders && npm run dev
cd services/payments && npm run dev

# Build a specific service for production
cd services/auth && npm run build
cd services/orders && npm run build
cd services/payments && npm run build

# Run tests
npm test
```

## Architecture

### Microservices Structure

**Auth Service (Port 3000)**
- Handles user authentication (signup, signin, signout)
- Uses JWT for session management with cookie-session
- MongoDB database: `auth`
- No Kafka dependencies

**Orders Service (Port 3001)**
- Manages ticket reservations and order lifecycle
- Publishes: `OrderCreatedEvent`, `OrderCancelledEvent`
- Listens: `PaymentCreatedEvent`
- MongoDB database: `orders`
- Includes dev-only ticket creation endpoint

**Payments Service (Port 3002)**
- Processes payments via Stripe
- Publishes: `PaymentCreatedEvent`
- Listens: `OrderCreatedEvent`, `OrderCancelledEvent`
- MongoDB database: `payments`
- Requires `STRIPE_KEY` environment variable

### Shared Library (`@logistream/shared`)

Located in `shared/`, this workspace provides common functionality across all services:

**Event Infrastructure**
- `BasePublisher<T>`: Abstract class for publishing events to Kafka topics
- `BaseListener<T>`: Abstract class for consuming events with consumer groups
- Event definitions: `OrderCreatedEvent`, `OrderCancelledEvent`, `PaymentCreatedEvent`
- `Topics` enum for topic name constants
- `OrderStatus` enum for order state machine

**Middlewares**
- `currentUser`: Extracts JWT from cookie and attaches user to req.currentUser
- `requireAuth`: Ensures user is authenticated before accessing route
- `validateRequest`: Handles express-validator errors
- `errorHandler`: Global error handler for Express

**Error Classes**
- `CustomError`: Base error class with statusCode and serializeErrors()
- `BadRequestError`, `NotFoundError`, `NotAuthorizedError`, `RequestValidationError`

**Logger**
- Winston-based logger configuration shared across services

### Event-Driven Communication

Services communicate asynchronously via Kafka:

1. Each service has a `kafka-wrapper.ts` singleton that initializes the Kafka client
2. Publishers extend `BasePublisher` and define their topic
3. Listeners extend `BaseListener`, define their topic and groupId, and implement `onMessage()`
4. Services connect to Kafka on startup via `kafkaWrapper.connect()`

**Event Flow Example:**
1. Orders service creates order → publishes `OrderCreatedEvent`
2. Payments service receives event → reserves payment window
3. Payment processed → publishes `PaymentCreatedEvent`
4. Orders service receives event → marks order complete

### Order State Machine

Order statuses flow through these states (defined in `shared/src/events/types/order-status.ts`):
- `Created`: Order created, ticket not reserved
- `AwaitingPayment`: Ticket reserved, awaiting payment
- `Complete`: Payment successful
- `Cancelled`: Order cancelled or ticket unavailable

## Development Notes

### Shared Library Workflow
- The shared library must be built (`npm run build --workspace=@logistream/shared`) before starting services
- Changes to shared library require rebuild unless using watch mode
- Services reference shared library via `@logistream/shared` workspace dependency

### Environment Configuration
Each service requires a `.env` file with:
- `JWT_KEY`: Secret for JWT signing
- `MONGO_URI`: MongoDB connection string
- `STRIPE_KEY`: (Payments only) Stripe secret key

### Testing with Postman
A `postman_collection.json` is included at the root with sample API requests for all endpoints.

### Docker Compose Setup
The `infra/docker-compose.yml` orchestrates:
- Kafka (port 9092) with Zookeeper
- MongoDB (port 27017)
- Optional service containers with Dockerfiles

Each service Dockerfile expects the shared library to be built in the context.
