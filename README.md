# LogiStream

LogiStream is a microservices-based application built with **Node.js**, **TypeScript**, **Express**, **Kafka**, and **MongoDB**. It demonstrates a robust event-driven architecture for handling orders, payments, and tickets.

## Architecture

The project is structured as a Monorepo using **NPM Workspaces** and consists of the following services:

### Services

| Service | Port | Description | Database |
| :--- | :--- | :--- | :--- |
| **Auth** | `3000` | Handles user authentication (Signup/Signin/Signout). | MongoDB (Auth) |
| **Orders** | `3001` | Manages ticket reservation and order creation. | MongoDB (Orders) |
| **Payments** | `3002` | Processes payments with Stripe. | MongoDB (Payments) |

### Shared Library

Located in `shared/`, the `@logistream/shared` library provides:
- **Event Bus Infrastructure**: Base classes for Kafka Publishers and Listeners.
- **Middlewares**: `currentUser`, `requireAuth`, `validateRequest`, etc.
- **Errors**: Standardized error classes (`BadRequestError`, `NotFoundError`, etc.).
- **Common Types**: Enums and shared interfaces.
- **Logger**: A shared Winston logger configuration.

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

    Example content for `services/payments/.env`:
    ```env
    JWT_KEY=your_secret_key
    MONGO_URI=mongodb://auth-mongo-srv:27017/auth
    STRIPE_KEY=your_stripe_secret_key
    ```
    *Note: In a real Kubernetes environment, these would be Kubernetes Secrets.*

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

| Variable | Description | Required Services |
| :--- | :--- | :--- |
| `JWT_KEY` | Secret key for signing JWTs. | All |
| `MONGO_URI` | Connection string for MongoDB. | All |
| `STRIPE_KEY` | Stripe Secret Key. | Payments |

