-- ============================================================================
-- Planning Tool Database Schema (Multi-Tenant SaaS)
-- PostgreSQL initialization script
-- Run: ./deploy.sh (auto runs this on first startup)
-- ============================================================================

-- ============================================================================
-- SUBSCRIPTION PLANS
-- ============================================================================

CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) DEFAULT 0,
    price_yearly DECIMAL(10, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    max_users INTEGER DEFAULT 3,
    max_tasks INTEGER DEFAULT 100,
    max_teams INTEGER DEFAULT 1,
    max_storage_mb INTEGER DEFAULT 100,
    max_projects INTEGER DEFAULT 1,
    features JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TENANTS (Organizations/Companies)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    logo_url TEXT,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    country VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    plan_id INTEGER REFERENCES plans(id) DEFAULT 1,
    subscription_status VARCHAR(20) DEFAULT 'trialing',
    trial_ends_at TIMESTAMP,
    subscription_ends_at TIMESTAMP,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    settings JSONB DEFAULT '{}'::jsonb,
    database_type VARCHAR(20) DEFAULT 'shared',
    database_host VARCHAR(255),
    database_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer_id ON tenants(stripe_customer_id);

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    tenant_role VARCHAR(50) DEFAULT 'member',
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);

-- Tenant invitations
CREATE TABLE IF NOT EXISTS tenant_invitations (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    token VARCHAR(255) UNIQUE NOT NULL,
    invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON tenant_invitations(token);

-- ============================================================================
-- TEAMS & ORGANIZATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(10),
    description TEXT,
    lead_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_tenant_id ON teams(tenant_id);

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

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_tenant_id ON comments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);

CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attachments_tenant_id ON attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);

CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_id ON activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_task_id ON activity_log(task_id);

-- ============================================================================
-- HR & RECRUITMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS draft_headcount (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_draft_headcount_tenant_id ON draft_headcount(tenant_id);

CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant_id ON leave_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);

CREATE TABLE IF NOT EXISTS leave_balances (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    annual_total INTEGER DEFAULT 15,
    annual_used INTEGER DEFAULT 0,
    sick_total INTEGER DEFAULT 10,
    sick_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_tenant_id ON leave_balances(tenant_id);

-- ============================================================================
-- BOOKMARKS & COLLECTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_bookmarks_tenant_id ON bookmarks(tenant_id);

CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) DEFAULT 'General',
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_collections_tenant_id ON collections(tenant_id);

CREATE TABLE IF NOT EXISTS collection_members (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collection_id, user_id)
);

-- ============================================================================
-- DIAGRAMS & VISUALIZATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS diagrams (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    diagram_data TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_diagrams_tenant_id ON diagrams(tenant_id);

-- ============================================================================
-- SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, key)
);

CREATE INDEX IF NOT EXISTS idx_settings_tenant_id ON settings(tenant_id);

-- ============================================================================
-- USAGE TRACKING & BILLING
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_tracking (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    users_count INTEGER DEFAULT 0,
    tasks_count INTEGER DEFAULT 0,
    teams_count INTEGER DEFAULT 0,
    projects_count INTEGER DEFAULT 0,
    storage_used_mb DECIMAL(10, 2) DEFAULT 0,
    api_calls_count INTEGER DEFAULT 0,
    api_calls_limit INTEGER DEFAULT 1000,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_tenant_id ON usage_tracking(tenant_id);

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stripe_invoice_id VARCHAR(255) UNIQUE,
    stripe_payment_intent_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'draft',
    description TEXT,
    invoice_pdf_url TEXT,
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    due_date TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);

-- ============================================================================
-- AUDIT LOG (Enterprise)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- FEATURE FLAGS & API
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    rules JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhooks (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret VARCHAR(255),
    events TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_id ON webhooks(tenant_id);

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL,
    scopes TEXT[] DEFAULT ARRAY['read'],
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);

-- ============================================================================
-- AI PROVIDER API KEYS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_provider_keys (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    provider VARCHAR(50) NOT NULL,              -- openai, anthropic, google, azure, custom
    name VARCHAR(100) NOT NULL,                 -- User-friendly name
    api_key_encrypted TEXT NOT NULL,            -- Encrypted API key

    -- Provider-specific settings
    model VARCHAR(100),                         -- Default model (gpt-4, claude-3, etc.)
    base_url TEXT,                              -- Custom endpoint URL (for Azure, local)
    settings JSONB DEFAULT '{}'::jsonb,         -- Additional provider settings
    /*
    Example settings:
    {
        "organization_id": "org-xxx",           -- OpenAI org
        "api_version": "2024-01-01",            -- Azure API version
        "temperature": 0.7,
        "max_tokens": 4096
    }
    */

    -- Usage tracking
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_keys_tenant_id ON ai_provider_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_keys_provider ON ai_provider_keys(provider);

COMMENT ON TABLE ai_provider_keys IS 'Encrypted API keys for AI providers (OpenAI, Anthropic, etc.)';

-- ============================================================================
-- GUEST TRIAL (Virtual Office Translation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS guest_trials (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) UNIQUE NOT NULL,      -- Unique guest session identifier
    ip_address INET,                              -- Track IP to prevent abuse
    username VARCHAR(100),                        -- Guest display name
    usage_count INTEGER DEFAULT 0,               -- Current translation count
    max_uses INTEGER DEFAULT 10,                 -- Maximum allowed translations
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',
    last_used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guest_trials_session_id ON guest_trials(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_trials_ip_address ON guest_trials(ip_address);
CREATE INDEX IF NOT EXISTS idx_guest_trials_expires_at ON guest_trials(expires_at);

COMMENT ON TABLE guest_trials IS 'Track guest user trial usage for Virtual Office translation feature';

-- Guest translation logs (for admin review)
CREATE TABLE IF NOT EXISTS guest_translation_logs (
    id SERIAL PRIMARY KEY,
    guest_trial_id INTEGER REFERENCES guest_trials(id) ON DELETE CASCADE,
    session_id VARCHAR(64) NOT NULL,
    original_text TEXT NOT NULL,
    translated_text TEXT,
    detected_language VARCHAR(20),
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guest_translation_logs_session_id ON guest_translation_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_translation_logs_created_at ON guest_translation_logs(created_at);

COMMENT ON TABLE guest_translation_logs IS 'Log all guest translations for admin review and system improvement';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION check_tenant_limit(p_tenant_id INTEGER, p_resource_type VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
    v_plan_limit INTEGER;
    v_current_count INTEGER;
BEGIN
    SELECT CASE p_resource_type
        WHEN 'users' THEN p.max_users
        WHEN 'tasks' THEN p.max_tasks
        WHEN 'teams' THEN p.max_teams
        ELSE -1
    END INTO v_plan_limit
    FROM tenants t JOIN plans p ON t.plan_id = p.id WHERE t.id = p_tenant_id;

    IF v_plan_limit = -1 THEN RETURN TRUE; END IF;

    SELECT CASE p_resource_type
        WHEN 'users' THEN (SELECT COUNT(*) FROM users WHERE tenant_id = p_tenant_id)
        WHEN 'tasks' THEN (SELECT COUNT(*) FROM tasks WHERE tenant_id = p_tenant_id)
        WHEN 'teams' THEN (SELECT COUNT(*) FROM teams WHERE tenant_id = p_tenant_id)
        ELSE 0
    END INTO v_current_count;

    RETURN v_current_count < v_plan_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Subscription Plans
INSERT INTO plans (name, display_name, description, price_monthly, price_yearly, max_users, max_tasks, max_teams, max_storage_mb, max_projects, features, sort_order)
VALUES
    ('free', 'Free', 'For individuals getting started', 0, 0, 3, 100, 1, 100, 1, '{"api_access": false, "custom_domain": false, "sso": false, "priority_support": false}'::jsonb, 1),
    ('starter', 'Starter', 'For small teams', 10, 100, 10, 500, 3, 1000, 5, '{"api_access": false, "custom_domain": false, "sso": false, "data_export": true}'::jsonb, 2),
    ('pro', 'Pro', 'For growing teams', 30, 300, 50, 5000, 10, 10000, 20, '{"api_access": true, "advanced_reports": true, "data_export": true}'::jsonb, 3),
    ('business', 'Business', 'For large teams', 100, 1000, 200, -1, -1, 100000, -1, '{"api_access": true, "custom_domain": true, "priority_support": true, "audit_log": true}'::jsonb, 4),
    ('enterprise', 'Enterprise', 'Custom solutions', 0, 0, -1, -1, -1, -1, -1, '{"api_access": true, "custom_domain": true, "sso": true, "dedicated_db": true, "white_label": true}'::jsonb, 5)
ON CONFLICT (name) DO NOTHING;

-- Default Tenant (Demo)
INSERT INTO tenants (name, slug, email, plan_id, subscription_status, trial_ends_at)
VALUES ('Demo Company', 'demo', 'admin@example.com', 3, 'trialing', NOW() + INTERVAL '14 days')
ON CONFLICT (slug) DO NOTHING;

-- Default Users (tenant_id = 1)
-- Password for all users: password123
INSERT INTO users (tenant_id, tenant_role, name, email, password_hash, role, position)
VALUES
    (1, 'owner', 'Admin User', 'admin@example.com', '$2b$12$.YSpLLGurirdehbb/E/zdOV6alUAIx3Ed.zSNfqFvE/5tJ1lgPXWu', 'admin', 'System Administrator'),
    (1, 'member', 'Toffee2', 'toffee2@example.com', '$2b$12$.YSpLLGurirdehbb/E/zdOV6alUAIx3Ed.zSNfqFvE/5tJ1lgPXWu', 'developer', 'Senior Developer'),
    (1, 'member', 'Natchapon', 'natchapon@example.com', '$2b$12$.YSpLLGurirdehbb/E/zdOV6alUAIx3Ed.zSNfqFvE/5tJ1lgPXWu', 'developer', 'Developer'),
    (1, 'member', 'Test User 1', 'test1@example.com', '$2b$12$.YSpLLGurirdehbb/E/zdOV6alUAIx3Ed.zSNfqFvE/5tJ1lgPXWu', 'qa', 'QA Engineer'),
    (1, 'member', 'Test User 2', 'test2@example.com', '$2b$12$.YSpLLGurirdehbb/E/zdOV6alUAIx3Ed.zSNfqFvE/5tJ1lgPXWu', 'designer', 'UI/UX Designer')
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Default Teams
INSERT INTO teams (tenant_id, name, icon, description)
VALUES
    (1, 'Development', '💻', 'Development team'),
    (1, 'Design', '🎨', 'Design team'),
    (1, 'QA', '🧪', 'Quality Assurance team')
ON CONFLICT DO NOTHING;

-- Feature Flags
INSERT INTO feature_flags (name, description, is_enabled, rules)
VALUES
    ('virtual_office', 'Virtual Office feature', true, '[]'::jsonb),
    ('ai_assistant', 'AI Assistant feature', false, '[{"type": "plan", "plans": ["pro", "business", "enterprise"], "enabled": true}]'::jsonb),
    ('advanced_analytics', 'Advanced Analytics', false, '[{"type": "plan", "plans": ["business", "enterprise"], "enabled": true}]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE plans IS 'Subscription plans with features and limits';
COMMENT ON TABLE tenants IS 'Organizations/Companies - each tenant is isolated';
COMMENT ON TABLE users IS 'Users belong to a tenant';
COMMENT ON TABLE usage_tracking IS 'Track resource usage per tenant';
COMMENT ON TABLE audit_logs IS 'Security audit trail for enterprise';
