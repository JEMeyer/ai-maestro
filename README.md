# AI-Maestro

## Overview

AI-Maestro is a cutting-edge model deployment and management system built to leverage **vLLM** for optimized inference performance. It provides a unified interface for deploying, monitoring, and managing AI models across multiple GPU servers. Designed for **high-performance AI inference**, it streamlines the management of **large language models (LLMs)** and multimodal AI capabilities, integrating **vLLM, Coqui for speech, and Diffusers for image generation**.

## Features

- **Centralized Model Deployment & Management**: Deploy and manage models effortlessly through a robust backend.
- **Real-time Monitoring**: GPU utilization, memory usage, request latency, and model performance tracking.
- **Scalability & Efficiency**: Optimized for **multi-GPU environments** with efficient load balancing.
- **Security & Access Control**: Secure API authentication and Cloudflare tunnel support.
- **User-friendly Interface**: A **React-based frontend** with real-time status tracking and visualization.

## Tech Stack

### **Frontend**
- **React + TypeScript**
- Chakra UI for modern UI/UX
- Real-time metrics visualization
- WebSocket support for live updates

### **Backend**
- **Node.js + Express (TypeScript)**
- PostgreSQL for database management
- Prometheus for performance metrics
- WebSockets for real-time communication
- Docker Engine API for managing deployments

### **AI Components**
- **vLLM** for efficient LLM inference
- **Coqui** for speech synthesis
- **Diffusers** for image generation

## System Architecture

### **Infrastructure**

| Component               | Specifications |
|------------------------|---------------|
| **GPU Workers**        | Machines to run GPU compute docker containers |
| **Management Server**  | Runs the maestro FE/BE |
| **Storage Server**     | Holds centralized model data |
| **Monitoring Stack**   | Prometheus + Grafana |
| **External Access**    | Cloudflare Tunnels |
| **Error Tracking**     | Sentry |

### **Core Components**

- **vLLM Router/Management**:
  - Centralized routing and load balancing
  - Deployment management via Docker API
  - Metrics collection and monitoring
  - API for frontend interactions

- **GPU Workers**:
  - Compute nodes running vLLM workers
  - Fixed GPU assignments via Docker
  - Metrics exposure for monitoring

## Database Schema

```sql
CREATE TABLE deployments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    model_id VARCHAR(255) NOT NULL,  -- HuggingFace model ID
    worker_addresses TEXT[] NOT NULL, -- Array of worker endpoints
    gpu_count INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,      -- running/stopped/failed
    config JSONB NOT NULL,            -- vLLM configuration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gpu_servers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    gpu_count INTEGER NOT NULL,
    gpu_type VARCHAR(50) NOT NULL,    -- 3090/P100
    vram_per_gpu INTEGER NOT NULL,    -- in MB
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deployment_history (
    id SERIAL PRIMARY KEY,
    deployment_id INTEGER REFERENCES deployments(id),
    status VARCHAR(50) NOT NULL,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## **Local Development (Docker Compose Setup)**

```yaml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - REACT_APP_API_URL=http://localhost:8000

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/aimaestro
      - NODE_ENV=development
    depends_on:
      - db

  db:
    image: postgres:17-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=aimaestro
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## **Security Considerations**
- Internal network isolation for secure deployments
- API authentication for controlled access
- Cloudflare tunnel for external access
- Secure Docker API access

## **Deployment & Scaling**
- Kubernetes or Docker Swarm for horizontal scaling
- Auto-scaling policies for efficient GPU utilization
- Remote access via Cloudflare Tunnels

## **Getting Started**

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/aimaestro.git
   cd aimaestro
   ```
2. **Start development environment**
   ```bash
   docker-compose up --build
   ```
3. **Access the application**
   - **Frontend**: `http://localhost:3000`
   - **Backend**: `http://localhost:8000`

## **Contributing**
We welcome contributions! Please open an issue or submit a pull request with your improvements.

## **License**
MIT License. See `LICENSE` for details.

