# Swaply Video Calling Platform — Deployment & Operations Guide

This guide provides step-by-step instructions for deploying and running the Swaply 1-to-1 video calling and secure messaging platform in production.

---

## 1. System Architecture Overview
Swaply is built as a lightweight, decoupled real-time system:
- **Frontend**: Vite + React Single Page Application utilizing Vanilla CSS (Retro styling) and standard WebRTC APIs.
- **Backend**: Express + Node.js HTTP & Socket.io server handles signaling, presence, state synchronization, and REST endpoints.
- **Database**: PostgreSQL handles secure user directories, authentication hashes, and call logs.
- **Signaling & STUN/TURN**: Runs on Socket.io for offer/answer SDP relays, and relies on STUN/TURN servers (like Google STUN and coturn) for P2P connection establishment across restrictive firewalls.

---

## 2. Environment Variables Checklist

Create a `.env` file in the `backend` directory (and configure these on your cloud provider):

```ini
# Server Setup
PORT=5000
NODE_ENV=production

# Database Connection
PGUSER=your_postgres_username
PGHOST=your_postgres_host
PGDATABASE=your_postgres_database
PGPASSWORD=your_postgres_password
PGPORT=5432

# JWT Security Secrets
JWT_ACCESS_SECRET=your_jwt_access_secret_long_random_string
JWT_REFRESH_SECRET=your_jwt_refresh_secret_long_random_string

# TURN/STUN Server Credentials (HMAC dynamic signature)
COTURN_AUTH_SECRET=your_coturn_static_auth_shared_secret
COTURN_TURN_URL=turn:your-turn-server-domain.com:3478
```

For the `frontend` directory, create a `.env.production` file:

```ini
VITE_BACKEND_URL=https://your-backend-api.herokuapp.com
```

---

## 3. Database Schema Setup

Swaply requires a PostgreSQL database. Initialize your database using the SQL schema located in `backend/schema.sql`:

```bash
# Example command using psql CLI:
psql -h localhost -U postgres -d swaply -f backend/schema.sql
```

Ensure the following tables are created:
- `users`: stores user nodes, status, and last seen timestamps.
- `calls`: stores transaction states, session history, and durations.
- `call_feedback`: stores user ratings and checkbox issue reports.

---

## 4. Production Hosting Guide

### Backend (Express & Socket.io)
Deploy the Node.js server to cloud hosts like **Render**, **Railway**, or **Heroku**:
1. Connect your Github repository.
2. Set Build Command: `npm install` inside the `backend` directory.
3. Set Start Command: `node server.js` inside the `backend` directory.
4. Input all the environment variables from Section 2.
5. Enable WebSockets support (default on Render/Railway, requires sticky sessions on Heroku if using polling fallback).

### Frontend (Vite Static Build)
Compile the frontend static assets and host them on **Vercel**, **Netlify**, or **Cloudflare Pages**:
1. Connect your repository.
2. Select root directory: `frontend/`.
3. Set Build Command: `npm run build`.
4. Set Output Directory: `dist/`.
5. Deploy.

---

## 5. Production TURN Server Setup
To allow calls when users are behind strict corporate firewalls (Symmetric NATs):
1. Install `coturn` on a VPS (e.g., Ubuntu server).
2. Configure `/etc/turnserver.conf`:
   ```text
   listening-port=3478
   fingerprint
   lt-cred-mech
   use-auth-secret
   static-auth-secret=your_coturn_static_auth_shared_secret
   realm=your-turn-server-domain.com
   total-quota=100
   bps-capacity=0
   ```
3. Run the service: `sudo systemctl start coturn`.
4. Set `COTURN_AUTH_SECRET` and `COTURN_TURN_URL` in the backend `.env` variables to automatically enable dynamic HMAC-signed TURN credentials!

---

## 6. Troubleshooting
- **No Video Feed / Blinking**: Ensure the page is loaded under a secure context (**HTTPS** or **localhost**). Mobile browsers block camera and microphone access entirely on insecure HTTP origins.
- **ICE Connection Fails**: Check that firewall ports `3478` (TCP/UDP) and UDP ports `49152-65535` are open on your TURN VPS instance.
- **Throttling Warning**: If a user is throttled, verify they aren't running multiple browser tabs that trigger high-frequency signaling events.
