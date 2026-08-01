import pg from 'pg';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const { Client } = pg;

async function createAdmin() {
  const dbName = process.env.PGDATABASE || 'swaply';
  const client = new Client({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || '5432', 10),
    database: dbName
  });

  try {
    await client.connect();

    const email = 'founder@swaplyone.in';
    const username = 'founder';
    const password = 'lichisw@26';

    console.log(`Hashing password for admin ${email}...`);
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(password, salt);

    const betaId = 'SWP-FOUNDER';
    const qrToken = `qr_tok_${randomUUID()}`;
    const securityId = `sec_${randomUUID()}`;

    // Clean up if user already exists
    await client.query('DELETE FROM users WHERE email = $1 OR username = $2', [email, username]);

    console.log('Inserting admin user...');
    await client.query(
      `INSERT INTO users (security_id, name, username, email, password_hash, beta_id, qr_token, qr_active, is_admin, email_verified, allow_requests, searchable) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, TRUE, TRUE, TRUE, TRUE)`,
      [securityId, 'Founder', username, email, passwordHash, betaId, qrToken]
    );

    console.log('✅ Administrator account successfully created and seeded!');
    console.log(`- Username: ${username}`);
    console.log(`- Email:    ${email}`);
    console.log(`- Password: ${password}`);
    console.log(`- Role:     Admin`);
    
  } catch (err) {
    console.error('❌ Failed to create admin user:', err);
  } finally {
    await client.end();
  }
}

createAdmin();
