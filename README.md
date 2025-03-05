

# DepthSense
data visualization tool for using Parallax to create 3D visuals

# CPSC 597 Final Project

Welcome to the **CPSC 597 Final Project** repository! This project delivers a **web application** with a **secure microservices architecture** that enables analysts to create **2.5D parallaxed data visuals** within a browser-based Editor service. A separate Viewer service then displays these visuals, which can be embedded into third-party applications (e.g., **Tableau dashboards**). Additionally, we incorporate an **Authentication Service** and a **PostgreSQL** database to manage user credentials, roles, and data persistence securely.

Below is a comprehensive overview of the architecture, including **NGINX** as a reverse proxy, instructions on how to **start** the project with **Docker**, how to **test** it, and recommended changes to the **SRS** and **code**.

---

## 1. Project Overview

- **Project Goal**  
  Provide an interactive **2.5D parallax data visualization** tool that can be created by analysts and viewed by any end user. The system supports secure user management (via the **Authentication Service**) and persistent data storage (via **PostgreSQL**).

- **Key Documents**  
  - **SRS (Software Requirements Specification)**: Defines functional and non-functional requirements.  
  - **Abstract Proposal**: Outlines high-level objectives and feasibility.

---

## 2. Architecture

This project is comprised of **four main services**, all orchestrated by **NGINX** and Docker:

1. **Authentication Service**  
   - Responsible for **user authentication** and **authorization** (role-based).  
   - Exposes endpoints for login, logout, and token verification.  

2. **Editor Service**  
   - Web-based interface (HTML, CSS, JavaScript) for analysts to **create/edit** parallax data visuals.  
   - Integrates with the **Authentication Service** to ensure only authorized analysts can edit.  
   - Persists and retrieves project configurations from **PostgreSQL**.

3. **Viewer Service**  
   - Standalone microservice that **renders** the 2.5D parallaxed data visual to any end user.  
   - Can be **embedded** in Tableau or other third-party applications.  

4. **PostgreSQL**  
   - Centralized **database** storing user accounts, session tokens (if needed), and project configurations.  

5. **NGINX Reverse Proxy**  
   - Routes incoming requests to the appropriate service.  
   - Optionally handles **SSL termination**, **caching**, and **load balancing**.


---

## 3. The Authentication Service

This service manages **users, roles, and sessions**:

- **Endpoints**:
  - `POST /auth/login` - Validates user credentials and returns a session token.
  - `POST /auth/logout` - Invalidates the current session token.
  - `GET /auth/verify` - Verifies the validity of a provided token.

- **Role-based Access Control (RBAC)**:
  - Analyst roles have **create/edit** privileges in the Editor Service.
  - Viewer roles can only **view** the 2.5D parallax content via the Viewer Service.

---

## 4. The Editor Service

The Editor Service provides a user interface for **analysts** to:

1. **Import or fetch** data.
2. Configure **2.5D layers** for parallax effects.
3. Save the resulting visual configurations to the **PostgreSQL** database.

**Key Technologies**:
- **Frontend**: HTML/CSS/JavaScript (or a framework like React/Vue).  
- **Backend**: Could be Node.js/Express, Python/Flask, etc.  
- **API Calls**:
  - Interacts with **Authentication Service** for login and role checks.
  - Interacts with **PostgreSQL** for data persistence.

---

## 5. The Viewer Service

A **lightweight** microservice that **renders** the final 2.5D data visual. Analysts can share a link or embed the output in **Tableau** or other dashboards.

**Features**:
- **Dynamic rendering** of the parallax effect (HTML, CSS, JavaScript).
- **Read-only** access to data from the Editor’s saved configurations in **PostgreSQL**.

The Viewer Service is designed for performance, focusing on quickly loading visuals for end users.

---

## 6. PostgreSQL Database

All user data, session tokens (if stored), and configuration details for the 2.5D visuals are persisted in **PostgreSQL**.

- **Migrations**: The project can use tools like Flyway or Sequelize (if Node) to version and manage schema changes.
- **Security**: Proper use of environment variables for credentials.  
- **Backups**: Ensuring periodic backups for disaster recovery.

---

## 7. NGINX Reverse Proxy

Used as the **public entry point** to the microservices:

- **Routes** requests for:
  - `auth.myproject.com` → **Authentication Service**
  - `editor.myproject.com` → **Editor Service**
  - `viewer.myproject.com` → **Viewer Service**
- **SSL termination** (optional).
- **Proxy caching** or load balancing (if needed).

An example snippet in `nginx.conf`:

```nginx
http {
  upstream auth_service {
    server auth_service:5000;
  }
  upstream editor_service {
    server editor_service:3000;
  }
  upstream viewer_service {
    server viewer_service:4000;
  }

  server {
    listen 80;
    server_name localhost;

    location /auth/ {
      proxy_pass http://auth_service;
    }

    location /editor/ {
      proxy_pass http://editor_service;
    }

    location /viewer/ {
      proxy_pass http://viewer_service;
    }
  }
}

