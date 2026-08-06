-- Swaply PostgreSQL Database Schema

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    security_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_image TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    online_status VARCHAR(50) DEFAULT 'offline',
    notice_accepted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_users_online_status ON users(online_status);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. Skills Table
CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);

-- 3. User Skills Table (Mapping)
CREATE TABLE IF NOT EXISTS user_skills (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
    skill_type VARCHAR(50) NOT NULL CHECK (skill_type IN ('TEACH', 'LEARN')),
    PRIMARY KEY (user_id, skill_id, skill_type)
);

CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON user_skills(skill_id);

-- 4. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Conversation Members Table (Mapping)
CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members(user_id);

-- 6. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    moderation_status VARCHAR(50) DEFAULT 'APPROVED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at DESC);

-- 7. Calls Table
CREATE TABLE IF NOT EXISTS calls (
    id SERIAL PRIMARY KEY,
    caller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- ringing, active, completed, rejected, missed
    session_id VARCHAR(100),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration INTEGER -- in seconds
);

CREATE INDEX IF NOT EXISTS idx_calls_caller ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver ON calls(receiver_id);

-- 8. Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, REVIEWED, ACTION_TAKEN, DISMISSED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);

-- 9. Blocks Table
CREATE TABLE IF NOT EXISTS blocks (
    blocker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_id, blocked_user_id)
);

-- 10. Call Feedback Table
CREATE TABLE IF NOT EXISTS call_feedback (
    id SERIAL PRIMARY KEY,
    call_id INTEGER REFERENCES calls(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    issues TEXT[],
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_call_feedback_call ON call_feedback(call_id);

-- Migration updates
ALTER TABLE users ADD COLUMN IF NOT EXISTS notice_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_calls_started ON calls(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_user_id);

-- Phase 5 Additions
ALTER TABLE users ADD COLUMN IF NOT EXISTS beta_id VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS qr_token VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS searchable BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_requests BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_beta_id BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS qr_active BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS friend_requests (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_sender_receiver CHECK (sender_id <> receiver_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_requests 
ON friend_requests(sender_id, receiver_id) 
WHERE (status = 'PENDING');

CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);

CREATE TABLE IF NOT EXISTS friendships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_friendships_self CHECK (user_id <> friend_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_friendships 
ON friendships (LEAST(user_id, friend_id), GREATEST(user_id, friend_id));

CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);

-- ==========================================
-- Phase 7: Web Privacy additions
-- ==========================================
ALTER TABLE reports ADD COLUMN IF NOT EXISTS call_id INTEGER REFERENCES calls(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS privacy_event_id INTEGER;

CREATE TABLE IF NOT EXISTS privacy_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    call_id INTEGER REFERENCES calls(id) ON DELETE CASCADE,
    target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    beta_id_snapshot VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    platform VARCHAR(50) DEFAULT 'web',
    browser VARCHAR(100),
    severity VARCHAR(50) DEFAULT 'warning',
    status VARCHAR(50) DEFAULT 'NEW' CHECK (status IN ('NEW', 'REVIEWED', 'RESOLVED', 'ESCALATED')),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_privacy_events_user ON privacy_events(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_events_call ON privacy_events(call_id);
CREATE INDEX IF NOT EXISTS idx_privacy_events_timestamp ON privacy_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_events_type ON privacy_events(event_type);
CREATE INDEX IF NOT EXISTS idx_privacy_events_severity ON privacy_events(severity);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    target_id INTEGER,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure calls table has session_id column
ALTER TABLE calls ADD COLUMN IF NOT EXISTS session_id VARCHAR(100);

-- Phase 8 User additions
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications JSONB DEFAULT '{"friendRequests": true, "friendAccepted": true, "betaUpdates": true, "productAnnouncements": true}';

-- Phase 8: email_verification_codes table (Module 4)
CREATE TABLE IF NOT EXISTS email_verification_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- FIRST_LOGIN, EMAIL_VERIFICATION, PASSWORD_RESET, EMAIL_CHANGE
    expires_at TIMESTAMP NOT NULL,
    attempt_count INTEGER DEFAULT 0,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evc_user_id ON email_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_evc_email ON email_verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_evc_expires ON email_verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_evc_purpose ON email_verification_codes(purpose);

-- Phase 8: email_logs table (Module 15)
CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recipient VARCHAR(255) NOT NULL,
    email_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL, -- QUEUED, SENT, FAILED, BOUNCED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    provider_id VARCHAR(255)
);

-- Phase 10: Scheduled Account Deletion & Recovery System
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_status VARCHAR(50) DEFAULT 'ACTIVE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovered_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

CREATE TABLE IF NOT EXISTS account_deletion_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100),
    email VARCHAR(255),
    beta_id VARCHAR(50),
    deletion_reason TEXT,
    deletion_status VARCHAR(50) DEFAULT 'PENDING_DELETION', -- PENDING_DELETION, RECOVERED, PERMANENTLY_DELETED
    deletion_requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scheduled_deletion_at TIMESTAMP NOT NULL,
    recovered_at TIMESTAMP,
    ip_address VARCHAR(100),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_adr_user_id ON account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_adr_status ON account_deletion_requests(deletion_status);
CREATE INDEX IF NOT EXISTS idx_adr_scheduled ON account_deletion_requests(scheduled_deletion_at);


CREATE INDEX IF NOT EXISTS idx_el_user_id ON email_logs(user_id);

-- Phase 11: Comprehensive Beta Waitlist & Smart Batch Rollout System
CREATE TABLE IF NOT EXISTS beta_waitlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    beta_id VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    registration_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    waitlist_position INTEGER,
    rollout_batch INTEGER DEFAULT 1,
    rollout_status VARCHAR(50) DEFAULT 'WAITING_QUEUE', -- WAITING_QUEUE, READY_FOR_ROLLOUT, INVITED, ACCEPTED, EXPIRED, REJECTED, CANCELLED
    invite_sent_time TIMESTAMP,
    invitation_expiry_time TIMESTAMP,
    activation_code VARCHAR(100),
    admin_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_bw_user_id ON beta_waitlist(user_id);
CREATE INDEX IF NOT EXISTS idx_bw_status ON beta_waitlist(rollout_status);
CREATE INDEX IF NOT EXISTS idx_bw_position ON beta_waitlist(waitlist_position);
CREATE INDEX IF NOT EXISTS idx_bw_expiry ON beta_waitlist(invitation_expiry_time);
CREATE INDEX IF NOT EXISTS idx_bw_code ON beta_waitlist(activation_code);

CREATE TABLE IF NOT EXISTS beta_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    max_capacity INTEGER DEFAULT 150,
    daily_batch_size INTEGER DEFAULT 10,
    rollout_active BOOLEAN DEFAULT TRUE,
    expiry_hours INTEGER DEFAULT 72,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO beta_config (id, max_capacity, daily_batch_size, rollout_active, expiry_hours)
VALUES (1, 150, 10, TRUE, 72)
ON CONFLICT (id) DO NOTHING;

-- Phase 12: Enterprise Production Suite Tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS presence_status VARCHAR(50) DEFAULT 'online';
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS call_preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read_status BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_category ON notifications(category);

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_name VARCHAR(100),
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address VARCHAR(100),
    location VARCHAR(100),
    is_trusted BOOLEAN DEFAULT FALSE,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_us_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_us_token ON user_sessions(session_token);

CREATE TABLE IF NOT EXISTS feedback_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    rating INTEGER,
    description TEXT NOT NULL,
    log_payload JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'SUBMITTED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fr_user_id ON feedback_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_fr_type ON feedback_reports(type);

CREATE TABLE IF NOT EXISTS changelog_entries (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ce_category ON changelog_entries(category);

-- Phase 14: Enterprise Compliance, Governance & Platform Hardening Tables

CREATE TABLE IF NOT EXISTS user_consents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    policy_type VARCHAR(50) NOT NULL, -- PRIVACY, TERMS, COMMUNITY, COOKIES
    version VARCHAR(50) NOT NULL,
    consented_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_uc_user ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_uc_type ON user_consents(policy_type);

CREATE TABLE IF NOT EXISTS legal_policy_versions (
    id SERIAL PRIMARY KEY,
    policy_type VARCHAR(50) UNIQUE NOT NULL,
    version VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_al_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_al_event ON activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_al_created ON activity_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    target_id INTEGER,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);

CREATE TABLE IF NOT EXISTS api_logs (
    id SERIAL PRIMARY KEY,
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER, -- ms
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON api_logs(status_code);

CREATE TABLE IF NOT EXISTS security_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) DEFAULT 'warning',
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sec_logs_user ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sec_logs_severity ON security_logs(severity);

CREATE TABLE IF NOT EXISTS feature_flags (
    key VARCHAR(100) PRIMARY KEY,
    enabled BOOLEAN DEFAULT TRUE,
    description TEXT,
    category VARCHAR(50) DEFAULT 'core',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS maintenance_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    active BOOLEAN DEFAULT FALSE,
    mode VARCHAR(50) DEFAULT 'scheduled', -- scheduled, emergency, read_only
    message TEXT DEFAULT 'System undergoes scheduled maintenance.',
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    countdown_seconds INTEGER DEFAULT 0,
    whitelisted_ips JSONB DEFAULT '[]'::jsonb,
    whitelisted_admin_ids JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO maintenance_state (id, active, mode, message)
VALUES (1, FALSE, 'scheduled', 'System is operational.')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_code VARCHAR(100) REFERENCES permissions(code) ON DELETE CASCADE,
    PRIMARY KEY(role_id, permission_code)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS media_files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100),
    virus_scanned BOOLEAN DEFAULT TRUE,
    is_temp BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mf_category ON media_files(category);
CREATE INDEX IF NOT EXISTS idx_mf_user ON media_files(user_id);

CREATE TABLE IF NOT EXISTS recent_searches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rs_user ON recent_searches(user_id, created_at DESC);



