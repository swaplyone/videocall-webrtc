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
