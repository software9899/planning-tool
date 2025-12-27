-- Planning Tool Database Schema
-- PostgreSQL initialization script

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'member',
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',
    priority VARCHAR(50) DEFAULT 'medium',
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    due_date TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tags TEXT[],
    estimate_hours DECIMAL(10, 2)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_activity_log_task_id ON activity_log(task_id);

-- Insert default admin user (password: admin123)
INSERT INTO users (name, email, password_hash, role) 
VALUES ('Admin User', 'admin@planningtool.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5OMxo8Y8SKSCO', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample data
INSERT INTO users (name, email, role) 
VALUES 
    ('John Doe', 'john@example.com', 'member'),
    ('Jane Smith', 'jane@example.com', 'member')
ON CONFLICT (email) DO NOTHING;

INSERT INTO teams (name, description)
VALUES 
    ('Development', 'Development team'),
    ('Design', 'Design team')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE tasks IS 'Main tasks table for kanban board';
COMMENT ON TABLE users IS 'Users and team members';
COMMENT ON TABLE teams IS 'Teams/groups for organizing tasks';
