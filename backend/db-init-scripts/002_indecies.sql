-- Indexes for deployments
CREATE INDEX idx_deployments_status ON deployments (status);

CREATE INDEX idx_deployments_model_id ON deployments (model_id);

-- Indexes for gpu_servers
CREATE INDEX idx_gpu_servers_name ON gpu_servers (name);

-- Indexes for gpus
CREATE INDEX idx_gpus_server_id ON gpus (server_id);

CREATE INDEX idx_gpus_type ON gpus (type);

CREATE INDEX idx_gpus_device_id ON gpus (device_id);

-- Indexes for deployment_workers
CREATE INDEX idx_deployment_workers_deployment_id ON deployment_workers (deployment_id);

CREATE INDEX idx_deployment_workers_gpu_id ON deployment_workers (gpu_id);

CREATE INDEX idx_deployment_workers_status ON deployment_workers (status);

CREATE INDEX idx_deployment_workers_server_port ON deployment_workers (server_name, port);
