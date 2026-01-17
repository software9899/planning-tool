-- Planning Tool Database Schema
-- PostgreSQL initialization script (Comprehensive Version)
-- Generated: 2026-01-14

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

-- Users table with full profile fields
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'member',
    position VARCHAR(255),
    line_manager INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    avatar_url TEXT,
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    computer VARCHAR(255),
    mobile VARCHAR(50),
    phone VARCHAR(50),
    birthday VARCHAR(50),
    disc_type VARCHAR(10),
    personality_type VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);

-- ============================================================================
-- TEAMS & ORGANIZATION
-- ============================================================================

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(10),
    description TEXT,
    lead_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team members junction table
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- ============================================================================
-- TASKS & PROJECT MANAGEMENT
-- ============================================================================

-- Tasks table with readiness checklist
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
    estimate_hours DECIMAL(10, 2),
    readiness_checklist JSONB,
    size VARCHAR(10)
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);

-- Attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_log_task_id ON activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

-- ============================================================================
-- HR & RECRUITMENT
-- ============================================================================

-- Draft headcount (recruitment positions)
CREATE TABLE IF NOT EXISTS draft_headcount (
    id SERIAL PRIMARY KEY,
    position_title VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    line_manager INTEGER REFERENCES users(id) ON DELETE SET NULL,
    required_skills TEXT,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open',
    recruiting_status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_draft_headcount_status ON draft_headcount(status);

-- Leave requests
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    days FLOAT NOT NULL,
    half_day_type VARCHAR(20),
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by VARCHAR(255),
    reviewed_date TIMESTAMP,
    dates TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_start_date ON leave_requests(start_date);

-- Leave balances
CREATE TABLE IF NOT EXISTS leave_balances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    annual_total INTEGER DEFAULT 15,
    annual_used INTEGER DEFAULT 0,
    sick_total INTEGER DEFAULT 10,
    sick_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_user_id ON leave_balances(user_id);

-- ============================================================================
-- BOOKMARKS & COLLECTIONS
-- ============================================================================

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    url TEXT NOT NULL,
    favicon TEXT,
    description TEXT,
    category VARCHAR(255) DEFAULT 'Uncategorized',
    tags JSONB DEFAULT '[]'::jsonb,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category);

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(255) DEFAULT 'General',
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_collections_owner_id ON collections(owner_id);
CREATE INDEX IF NOT EXISTS idx_collections_category ON collections(category);

-- Collection members junction table
CREATE TABLE IF NOT EXISTS collection_members (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collection_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_members_collection_id ON collection_members(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_members_user_id ON collection_members(user_id);

-- ============================================================================
-- DIAGRAMS & VISUALIZATIONS
-- ============================================================================

-- Diagrams table (for org charts, flowcharts, etc.)
CREATE TABLE IF NOT EXISTS diagrams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    diagram_data TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_diagrams_created_by ON diagrams(created_by);

-- ============================================================================
-- SETTINGS & CONFIGURATION
-- ============================================================================

-- Settings key-value store
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert all users with passwords
-- Password for admin: admin123
-- Password for others: password123
INSERT INTO users (name, email, password_hash, role, position)
VALUES
    ('Admin User', 'admin@example.com', '$2b$12$R.qu4.IwBPsFvYURYsKNfOofVQqaj3bV75Fz1KDr/PKkTSz2LTqmW', 'admin', 'System Administrator'),
    ('Toffee2', 'toffee2@example.com', '$2b$12$J6gIGBKYIISPRuJRnp97behR2SLchrnyufu0ws0Mv7w9nmtz2n4bW', 'developer', 'Senior Developer'),
    ('Natchapon Wanichkamonnan', 'natchapon@example.com', '$2b$12$J6gIGBKYIISPRuJRnp97behR2SLchrnyufu0ws0Mv7w9nmtz2n4bW', 'developer', 'Developer'),
    ('Test User 1', 'test1@example.com', '$2b$12$J6gIGBKYIISPRuJRnp97behR2SLchrnyufu0ws0Mv7w9nmtz2n4bW', 'qa', 'QA Engineer'),
    ('Test User 2', 'test2@example.com', '$2b$12$J6gIGBKYIISPRuJRnp97behR2SLchrnyufu0ws0Mv7w9nmtz2n4bW', 'designer', 'UI/UX Designer')
ON CONFLICT (email) DO NOTHING;

-- Set line_manager for Natchapon (reports to Toffee2)
UPDATE users SET line_manager = (SELECT id FROM users WHERE email = 'toffee2@example.com')
WHERE email = 'natchapon@example.com';

-- Insert sample teams
INSERT INTO teams (name, icon, description)
VALUES
    ('Development', '💻', 'Development team'),
    ('Design', '🎨', 'Design team'),
    ('QA', '🧪', 'Quality Assurance team')
ON CONFLICT DO NOTHING;

-- Add users to teams
INSERT INTO team_members (team_id, user_id)
SELECT t.id, u.id FROM teams t, users u
WHERE (t.name = 'Development' AND u.email IN ('toffee2@example.com', 'natchapon@example.com'))
   OR (t.name = 'Design' AND u.email = 'test2@example.com')
   OR (t.name = 'QA' AND u.email = 'test1@example.com')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Insert sample tasks
INSERT INTO tasks (title, description, status, priority, assigned_to, tags, estimate_hours)
VALUES
    ('Setup Development Environment', 'Install dependencies and configure development tools', 'done', 'high',
     (SELECT id FROM users WHERE email = 'toffee2@example.com'), ARRAY['setup', 'dev'], NULL),
    ('Implement User Authentication', 'Add login and registration functionality', 'in_progress', 'high',
     (SELECT id FROM users WHERE email = 'toffee2@example.com'), ARRAY['auth', 'backend'], 8),
    ('Design Dashboard UI', 'Create mockups for the main dashboard', 'todo', 'medium',
     (SELECT id FROM users WHERE email = 'test2@example.com'), ARRAY['design', 'ui'], 16),
    ('Write API Documentation', 'Document all API endpoints', 'todo', 'medium',
     (SELECT id FROM users WHERE email = 'natchapon@example.com'), ARRAY['documentation', 'api'], NULL),
    ('Setup Testing Framework', 'Configure pytest and write initial tests', 'in_progress', 'high',
     (SELECT id FROM users WHERE email = 'test1@example.com'), ARRAY['testing', 'qa'], 12)
ON CONFLICT DO NOTHING;

-- Insert default settings
INSERT INTO settings (key, value, description)
VALUES
    ('app_name', 'Planning Tool', 'Application name'),
    ('version', '1.0.0', 'Application version'),
    ('theme', 'light', 'Default theme')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'Users and team members with full profile information';
COMMENT ON TABLE teams IS 'Teams/groups for organizing tasks and members';
COMMENT ON TABLE team_members IS 'Junction table for team membership';
COMMENT ON TABLE tasks IS 'Main tasks table for kanban board and project management';
COMMENT ON TABLE draft_headcount IS 'Recruitment positions and hiring pipeline';
COMMENT ON TABLE leave_requests IS 'Employee leave/vacation requests';
COMMENT ON TABLE leave_balances IS 'Employee leave balance tracking';
COMMENT ON TABLE bookmarks IS 'User bookmarks and resource links';
COMMENT ON TABLE collections IS 'Bookmark collections/categories';
COMMENT ON TABLE diagrams IS 'Organizational charts and diagrams';
COMMENT ON TABLE settings IS 'Application configuration key-value store';
