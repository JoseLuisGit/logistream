# LogiStream

LogiStream is a microservices-based application built with **Node.js**, **TypeScript**, **Express**, **Kafka**, and **MongoDB**. It demonstrates a robust event-driven architecture for handling orders, payments, and tickets.

## Architecture

The project is structured as a Monorepo using **NPM Workspaces** and consists of the following services:

### Services

| Service | Port | Description | Database | Kafka Topics |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `3000` | Handles user authentication (Signup/Signin/Signout). | MongoDB (Auth) | None |
| **Orders** | `3001` | Manages ticket reservation and order creation. | MongoDB (Orders) | Publishes: `order:created`, `order:cancelled` |
| **Payments** | `3002` | Processes payments with Stripe. | MongoDB (Payments) | Publishes: `payment:created`<br>Listens: `order:created`, `order:cancelled` |

### Shared Library

Located in `shared/`, the `@logistream/shared` library provides:
- **Event Bus Infrastructure**: Base classes for Kafka Publishers and Listeners.
- **Kafka Wrapper**: Singleton for managing Kafka client connections.
- **App Factory**: Centralized Express app configuration with common middleware.
- **Server Bootstrap**: Unified server startup with environment validation and MongoDB connection.
- **Middlewares**: `currentUser`, `requireAuth`, `validateRequest`, `errorHandler`.
- **Errors**: Standardized error classes (`BadRequestError`, `NotFoundError`, `NotAuthorizedError`, etc.).
- **Common Types**: Enums (`Topics`, `OrderStatus`) and shared interfaces.
- **Logger**: A shared Winston logger configuration.

## Event-Driven Communication (Kafka)

LogiStream uses **Apache Kafka** for asynchronous event-driven communication between microservices. This decouples services and enables scalable, resilient architectures.

### Kafka Topics

All topics are defined in `shared/src/events/topics.ts`:

| Topic Name | Publisher | Listener(s) | Description |
| :--- | :--- | :--- | :--- |
| `order:created` | Orders Service | Payments Service | Emitted when a new order is created |
| `order:cancelled` | Orders Service | Payments Service | Emitted when an order is cancelled |
| `payment:created` | Payments Service | _(Future: Orders Service)_ | Emitted when a payment is successfully processed |
| `ticket:created` | _(Not implemented)_ | _(Future)_ | Reserved for ticket creation events |
| `ticket:updated` | _(Not implemented)_ | _(Future)_ | Reserved for ticket update events |

### Event Flows

#### 1. Order Creation Flow

```
User → Orders Service
  ↓
  Creates Order (status: Created)
  ↓
  Publishes: order:created
  ↓
Payments Service (Listener)
  ↓
  Saves order copy locally
  ↓
  Waits for payment request
```

**Event Data (`order:created`):**
```typescript
{
  id: string;           // Order ID
  status: OrderStatus;  // Order status (Created, AwaitingPayment, etc.)
  userId: string;       // User who created the order
  expiresAt: string;    // ISO timestamp for order expiration
  ticket: {
    id: string;         // Ticket ID
    price: number;      // Ticket price
  };
}
```

#### 2. Payment Processing Flow

```
User → Payments Service
  ↓
  Creates Stripe charge
  ↓
  Saves Payment record
  ↓
  Publishes: payment:created
  ↓
Orders Service (Future)
  ↓
  Updates order status to Complete
```

**Event Data (`payment:created`):**
```typescript
{
  id: string;        // Payment ID
  orderId: string;   // Associated order ID
  stripeId: string;  // Stripe charge ID
}
```

#### 3. Order Cancellation Flow

```
User → Orders Service
  ↓
  Updates Order (status: Cancelled)
  ↓
  Publishes: order:cancelled
  ↓
Payments Service (Listener)
  ↓
  Marks order as cancelled
  ↓
  Prevents future payments
```

**Event Data (`order:cancelled`):**
```typescript
{
  id: string;      // Order ID
  ticket: {
    id: string;    // Ticket ID (for releasing reservation)
  };
}
```

### Order State Machine

Orders flow through the following states (defined in `shared/src/events/types/order-status.ts`):

```
Created → AwaitingPayment → Complete
   ↓
Cancelled (terminal state)
```

- **`Created`**: Order created, ticket not yet reserved
- **`AwaitingPayment`**: Ticket reserved, waiting for payment
- **`Complete`**: Payment successful, order fulfilled
- **`Cancelled`**: Order cancelled or expired

### Consumer Groups

Each service uses consistent consumer group IDs to ensure proper message distribution:

- **Payments Service**: `payments-service` (for all listeners)

This ensures that each event is processed exactly once per service, even with multiple instances running.

## Prerequisites

- **Node.js** (v16+)
- **Docker** and **Docker Compose**
- **Stripe Account** (for Payments service key)

## Getting Started (Development)

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd LogiStream
    ```

2.  **Install dependencies:**
    This command installs dependencies for the root and all workspaces.
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    Create a `.env` file in each service directory (or rename `.env.example`).
    - `services/auth/.env`
    - `services/orders/.env`
    - `services/payments/.env`

    **Auth Service (`services/auth/.env`):**
    ```env
    JWT_KEY=your_secret_key
    MONGO_URI=mongodb://localhost:27017/auth
    PORT=3000
    ```

    **Orders Service (`services/orders/.env`):**
    ```env
    JWT_KEY=your_secret_key
    MONGO_URI=mongodb://localhost:27017/orders
    PORT=3001
    KAFKA_BROKERS=localhost:9092
    ```

    **Payments Service (`services/payments/.env`):**
    ```env
    JWT_KEY=your_secret_key
    MONGO_URI=mongodb://localhost:27017/payments
    PORT=3002
    STRIPE_KEY=sk_test_your_stripe_secret_key
    KAFKA_BROKERS=localhost:9092
    ```

    *Note: In production/Kubernetes, these would be managed via Kubernetes Secrets and ConfigMaps.*

4.  **Start Infrastructure:**
    Use Docker Compose to start Kafka, Zookeeper, and MongoDB instances.
    ```bash
    cd infra
    docker-compose up -d
    ```

5.  **Build Shared Library:**
    The shared library must be built before starting services.
    ```bash
    npm run build --workspace=@logistream/shared
    ```

6.  **Start Services:**
    You can run each service in a separate terminal.

    **Auth:**
    ```bash
    cd services/auth
    npm run dev
    ```

    **Orders:**
    ```bash
    cd services/orders
    npm run dev
    ```

    **Payments:**
    ```bash
    cd services/payments
    npm run dev
    ```

## Development Workflow

- **Shared Library Updates**: If you modify code in `shared/`, running `npm run build --workspace=@logistream/shared` is required for services to pick up the changes (unless you configure `tsc --watch`).
- **Events**: We use Kafka for async communication. Ensure Docker is running.
- **Hot Reload**: All services use `ts-node-dev` for automatic reloading during development.

## Code Architecture & Best Practices

### Shared Utilities

The refactored architecture consolidates common code into reusable utilities:

#### 1. Kafka Wrapper (`shared/src/kafka-wrapper.ts`)

Singleton pattern for managing Kafka client connections across services.

```typescript
import { kafkaWrapper } from '@logistream/shared';

// In your service startup:
await kafkaWrapper.connect('service-name', ['localhost:9092']);

// Use in publishers/listeners:
new MyPublisher(kafkaWrapper.client).publish(data);
```

#### 2. App Factory (`shared/src/app-factory.ts`)

Functional approach to Express app creation with standardized middleware:

```typescript
import { createExpressApp } from '@logistream/shared';

export const app = createExpressApp({
    routers: [
        currentUser,        // Middleware
        myRouter1,          // Router
        myRouter2,          // Router
    ],
    enableCookieSession: true, // Optional, default: true
});
```

**Benefits:**
- Consistent middleware ordering across all services
- Centralized error handling and 404 responses
- Automatic cookie-session configuration
- Support for both routers and middleware

#### 3. Server Bootstrap (`shared/src/server-bootstrap.ts`)

Unified server startup with validation and initialization:

```typescript
import { bootstrapServer } from '@logistream/shared';

bootstrapServer({
    app,
    port: Number(process.env.PORT) || 3000,
    requiredEnvVars: ['JWT_KEY', 'MONGO_URI'],
    onBeforeListen: async () => {
        // Custom initialization (Kafka, listeners, etc.)
        await kafkaWrapper.connect('my-service', process.env.KAFKA_BROKERS.split(','));
    },
});
```

**Features:**
- Environment variable validation with clear error messages
- Automatic MongoDB connection with error handling
- Configurable port via environment variable
- Custom initialization hook for service-specific setup
- Consistent logging across services

### Code Reduction Metrics

The refactoring achieved significant code consolidation:

| Metric | Before | After | Improvement |
| :--- | :--- | :--- | :--- |
| Duplicated code | ~180 lines | ~100 lines | **44% reduction** |
| Service-level files | 8 files | 3 shared utilities | **63% consolidation** |
| Auth service code | 60 lines | 22 lines | **63% reduction** |
| Orders service code | 63 lines | ~35 lines | **44% reduction** |
| Payments service code | 56 lines | ~30 lines | **46% reduction** |

### Functional Programming Principles

Following the project's coding guidelines:

- **Pure functions** for utilities (no classes for logic, only for singletons)
- **Interfaces over types** for better extensibility
- **Function composition** over class inheritance
- **Descriptive naming** with auxiliary verbs (`isReserved`, `hasError`, etc.)

## API Reference

### Auth Service (Port 3000)

| Method | Endpoint | Body | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/users/signup` | `{ "email": "test@test.com", "password": "password" }` | Register a new user. |
| `POST` | `/api/users/signin` | `{ "email": "test@test.com", "password": "password" }` | Log in a user. |
| `POST` | `/api/users/signout` | - | Log out the current user. |
| `GET`  | `/api/users/currentuser` | - | Get details of the currently logged-in user. |

### Orders Service (Port 3001)

| Method | Endpoint | Body | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/orders` | - | List all orders for the current user. |
| `POST` | `/api/tickets` | `{ "title": "Concert", "price": 20 }` | Create a new ticket (Dev/Test only). |
| `POST` | `/api/orders` | `{ "ticketId": "ticket_id_here" }` | Create a new order. |
| `GET` | `/api/orders/:id` | - | Get details of a specific order. |
| `DELETE` | `/api/orders/:id` | - | Cancel an order. |

### Payments Service (Port 3002)

| Method | Endpoint | Body | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payments` | `{ "token": "tok_visa", "orderId": "order_id" }` | Create a payment charge (requires Stripe token). |

## Testing Event Flows

### Manual Testing with Postman/cURL

1. **Create a User (Auth Service)**
   ```bash
   curl -X POST http://localhost:3000/api/users/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"password123"}'
   ```
   Save the returned JWT cookie for subsequent requests.

2. **Create a Ticket (Orders Service - Dev Only)**
   ```bash
   curl -X POST http://localhost:3001/api/tickets \
     -H "Content-Type: application/json" \
     -d '{"title":"Concert","price":20}'
   ```
   Save the returned `ticketId`.

3. **Create an Order (Triggers `order:created` event)**
   ```bash
   curl -X POST http://localhost:3001/api/orders \
     -H "Content-Type: application/json" \
     -H "Cookie: session=<jwt-from-signup>" \
     -d '{"ticketId":"<ticket-id>"}'
   ```
   This publishes an `order:created` event to Kafka, which the Payments Service will consume.

4. **Verify Event Reception**
   Check Payments Service logs for:
   ```
   Message received: order:created / 0 / <offset>
   ```

5. **Create a Payment (Triggers `payment:created` event)**
   ```bash
   curl -X POST http://localhost:3002/api/payments \
     -H "Content-Type: application/json" \
     -H "Cookie: session=<jwt-from-signup>" \
     -d '{"token":"tok_visa","orderId":"<order-id>"}'
   ```
   Use Stripe test tokens like `tok_visa` for testing.

### Monitoring Kafka Topics

View messages in real-time using Kafka console consumer:

```bash
# Connect to Kafka container
docker exec -it infra-kafka-1 /bin/bash

# View order:created events
kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic order:created \
  --from-beginning

# View order:cancelled events
kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic order:cancelled \
  --from-beginning

# View payment:created events
kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic payment:created \
  --from-beginning
```

### Verifying Data Consistency

Check that events are properly synchronized across services:

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017

# Check Orders database
use orders
db.orders.find().pretty()
db.tickets.find().pretty()

# Check Payments database
use payments
db.orders.find().pretty()   # Copy of orders from events
db.payments.find().pretty()

# Check Auth database
use auth
db.users.find().pretty()
```

## Production Setup

For production, each service includes a `Dockerfile`.

1.  **Build Images:**
    ```bash
    docker build -t logistream/auth ./services/auth
    docker build -t logistream/orders ./services/orders
    docker build -t logistream/payments ./services/payments
    ```

2.  **Deployment (Kubernetes):**
    *Manifests are planned for the `infra/k8s` directory.*
    You will need to create Deployments and Services for each microservice, along with a running Kafka cluster and MongoDB instance (or managed Atlas/Confluent Cloud services).

## Environment Variables

| Variable | Description | Required | Default | Services |
| :--- | :--- | :--- | :--- | :--- |
| `JWT_KEY` | Secret key for signing JWTs. | ✓ | - | All |
| `MONGO_URI` | Connection string for MongoDB. | ✓ | - | All |
| `STRIPE_KEY` | Stripe Secret Key for payment processing. | ✓ | - | Payments |
| `KAFKA_BROKERS` | Comma-separated list of Kafka broker addresses. | ✓ | - | Orders, Payments |
| `PORT` | HTTP port for the service. | ✗ | 3000/3001/3002 | All |
| `NODE_ENV` | Environment mode (`development`, `production`). | ✗ | `development` | All |

## Troubleshooting

### Common Issues

#### 1. Kafka Connection Errors

**Problem:** Service fails to start with "Cannot access Kafka client before connecting"

**Solution:**
- Ensure Kafka is running: `docker ps | grep kafka`
- Check `KAFKA_BROKERS` environment variable is set correctly
- Verify Kafka is accessible: `docker exec -it infra-kafka-1 kafka-broker-api-versions.sh --bootstrap-server localhost:9092`

#### 2. Events Not Being Received

**Problem:** Events are published but not consumed by listeners

**Solution:**
- Check consumer group status:
  ```bash
  docker exec -it infra-kafka-1 kafka-consumer-groups.sh \
    --bootstrap-server localhost:9092 \
    --group payments-service \
    --describe
  ```
- Verify topic exists:
  ```bash
  docker exec -it infra-kafka-1 kafka-topics.sh \
    --bootstrap-server localhost:9092 \
    --list
  ```
- Check service logs for listener startup messages
- Ensure `onBeforeListen` hook is calling `listen()` on listeners

#### 3. MongoDB Connection Errors

**Problem:** "MongoServerError: connect ECONNREFUSED"

**Solution:**
- Verify MongoDB is running: `docker ps | grep mongo`
- Check `MONGO_URI` format: `mongodb://localhost:27017/dbname`
- For Docker networks, use service names instead of localhost
- Ensure MongoDB port 27017 is exposed

#### 4. Missing Environment Variables

**Problem:** Service crashes with "Missing required environment variables: JWT_KEY, MONGO_URI"

**Solution:**
- Create `.env` file in service directory
- Ensure all required variables are set (see Environment Variables section)
- Restart the service after creating/updating `.env`

#### 5. Shared Library Not Found

**Problem:** TypeScript errors like "Cannot find module '@logistream/shared'"

**Solution:**
```bash
# Rebuild shared library
npm run build --workspace=@logistream/shared

# Reinstall dependencies
npm install

# Clear node_modules if needed
rm -rf node_modules services/*/node_modules
npm install
```

#### 6. Duplicate Kafka Events

**Problem:** Same event processed multiple times

**Solution:**
- Ensure consistent `groupId` across listener restarts
- Check that only one instance of the listener is running
- Verify consumer group configuration:
  ```bash
  docker exec -it infra-kafka-1 kafka-consumer-groups.sh \
    --bootstrap-server localhost:9092 \
    --all-groups \
    --describe
  ```

#### 7. Stripe Payment Errors

**Problem:** "Invalid API Key provided"

**Solution:**
- Verify `STRIPE_KEY` is set in Payments service `.env`
- Use test keys starting with `sk_test_`
- Get keys from: https://dashboard.stripe.com/test/apikeys
- Use test tokens like `tok_visa` for testing

### Debugging Tips

#### Enable Detailed Kafka Logging

Set environment variable for more verbose Kafka logs:
```env
KAFKAJS_LOG_LEVEL=debug
```

#### Check Service Health

```bash
# Auth Service
curl http://localhost:3000/api/users/currentuser

# Orders Service
curl http://localhost:3001/api/orders -H "Cookie: session=<jwt>"

# Payments Service
curl http://localhost:3002/api/payments -X POST -H "Content-Type: application/json"
```

#### Monitor All Kafka Topics

```bash
docker exec -it infra-kafka-1 kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --whitelist '.*' \
  --from-beginning
```

#### Reset Consumer Group Offset (Development Only)

If you need to replay events:
```bash
docker exec -it infra-kafka-1 kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group payments-service \
  --reset-offsets \
  --to-earliest \
  --all-topics \
  --execute
```

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Follow the functional programming principles outlined in `.claude/CLAUDE.md`
2. Use TypeScript interfaces over types
3. Keep functions pure and modular
4. Update shared library for common functionality
5. Add tests for new features
6. Update this README with any new topics or significant changes

## License

This project is for educational purposes demonstrating microservices architecture with event-driven patterns.

