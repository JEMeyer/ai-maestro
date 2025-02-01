CREATE TYPE deployment_status AS ENUM (
  'creating',
  'running',
  'failed',
  'stopped',
  'deleted'
);

CREATE TYPE worker_status AS ENUM (
  'creating',
  'running',
  'failed',
  'stopped'
);

CREATE TYPE gpu_type AS ENUM ('3090', 'P100');

CREATE TABLE deployments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    model_id VARCHAR(255) NOT NULL,
    status deployment_status NOT NULL DEFAULT 'creating',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gpu_servers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    host VARCHAR(255) NOT NULL UNIQUE,
    gpu_count INTEGER NOT NULL CHECK (gpu_count > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gpus (
    id SERIAL PRIMARY KEY,
    server_id INTEGER NOT NULL REFERENCES gpu_servers(id) ON DELETE CASCADE,
    device_id INTEGER NOT NULL CHECK (device_id >= 0),
    type gpu_type NOT NULL,
    vram_total INTEGER NOT NULL CHECK (vram_total > 0),
    max_workers INTEGER NOT NULL CHECK (max_workers > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(server_id, device_id)
);

CREATE TABLE deployment_workers (
    id SERIAL PRIMARY KEY,
    deployment_id INTEGER NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    gpu_id INTEGER NOT NULL REFERENCES gpus(id) ON DELETE CASCADE,
    server_name VARCHAR(255) NOT NULL,
    container_id VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL CHECK (port > 0),
    status worker_status NOT NULL DEFAULT 'creating',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(server_name, port)
);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update trigger for deployments
CREATE TRIGGER update_deployments_updated_at
    BEFORE UPDATE ON deployments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
