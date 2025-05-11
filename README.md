# ParaViz: 2.5D Parallax Data Visualization Platform

## Overview

ParaViz is a secure, browser-based web application that enables analysts to create and share 2.5D parallax-style data visualizations. These visuals can be embedded into third-party dashboards (e.g., Tableau) and are viewable via a separate Viewer service. The project follows a microservices architecture using NGINX as a reverse proxy and PostgreSQL for persistent storage.


### Key Features

- **Authentication Service**: Secure login/registration with JWT-based role validation.
- **Editor Service**: Upload datasets, configure layered parallax visualizations, and save them.
- **Viewer Service**: Render finalized visuals for embedding or sharing.
- **PostgreSQL**: Store user accounts, datasets, and visualization configurations.
- **NGINX Reverse Proxy**: Route incoming HTTP traffic to the appropriate microservice.

---

## Getting Started with Docker

### Prerequisites

- Docker and Docker Compose installed on your system.

### Build & Run All Services

Run the following command to build and start all services:

```bash
docker-compose up --build
```

This will:

1. Start PostgreSQL with the user/password/database configured in `docker-compose.yml`.
2. Start the Authentication, Editor, and Viewer services.
3. Launch the NGINX gateway on port 80, exposing the full application at `http://localhost`.

### Verify Health

- Confirm all services are live by visiting:  
  `http://localhost/health`
- Inspect individual containers:  
  ```bash
  docker ps
  docker logs <container_name>
  ```

---

## Running Tests

### 1. API Gateway Test (NGINX Routing)

**File**: `nginx.test.js`  
Run the test to verify routing from the gateway to the Authentication service for `/auth/register`:

```bash
node nginx.test.js
```


### 2. End-to-End (E2E) Puppeteer Tests

Run E2E tests locally or in Docker:

- **Local Development**:  
  ```bash
  npx jest tests/e2e/user-flow.test.js
  ```

- **Using Docker**:  
  1. Add a Puppeteer container to your `docker-compose.yml`.
  2. Use `host.docker.internal` to connect to the NGINX service.
  3. start with cmd line 'docker-compose up --build'


```yaml
# Example Puppeteer service in docker-compose.yml
puppeteer:
  image: buildkite/puppeteer
  depends_on:
    - nginx
  environment:
    - TARGET_URL=http://host.docker.internal