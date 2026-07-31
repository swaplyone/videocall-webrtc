import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const { Client } = pg;

async function run() {
  console.log('Swaply PostgreSQL Initializer Startup...\n');

  const dbName = process.env.PGDATABASE || 'swaply';

  // Step 1: Connect to default 'postgres' database to ensure the target database exists
  const defaultClient = new Client({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || '5432', 10),
    database: 'postgres'
  });

  try {
    await defaultClient.connect();
    
    // Check if target database exists
    const checkDb = await defaultClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (checkDb.rowCount === 0) {
      console.log(`Database "${dbName}" not found. Creating database...`);
      await defaultClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.warn('⚠️ Warning during database verification/creation:', err.message);
    console.log('Attempting to proceed with schema creation directly...');
  } finally {
    await defaultClient.end();
  }

  // Step 2: Connect to the target database and execute the schema.sql DDL
  const targetClient = new Client({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || '5432', 10),
    database: dbName
  });

  try {
    await targetClient.connect();
    const __dirname = path.resolve();
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log(`Applying tables and indexes to "${dbName}" from schema.sql...`);
    await targetClient.query(sql);
    console.log('✅ Database schema tables and indexes successfully applied.');

    // Seed initial skills taxonomy
    const defaultSkills = [
      ['Python Programming', 'Technology', 'Learn basic syntax, object-oriented concepts, and package usage.'],
      ['React Development', 'Technology', 'Build interfaces, hooks, state routing, and virtual DOM components.'],
      ['UI/UX Design', 'Design', 'Wireframes, color theory, user research journeys, and Figma design prototypes.'],
      ['Spanish Conversation', 'Language', 'Spanish language vocabulary, pronunciation, and dialogue practice.'],
      ['Guitar Practice', 'Music', 'Acoustic guitar chords, strumming rhythms, scale practices, and songwriting.']
    ];

    for (const skill of defaultSkills) {
      await targetClient.query(
        `INSERT INTO skills (name, category, description) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (name) DO NOTHING`,
        skill
      );
    }
    console.log('✅ Default skills seeded in directory.');

    // Seed existing users with beta_id and qr_token if they are null
    const usersRes = await targetClient.query(
      "SELECT id FROM users WHERE beta_id IS NULL OR qr_token IS NULL"
    );
    for (const u of usersRes.rows) {
      const betaId = 'SWP-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const qrToken = `qr_tok_${randomUUID()}`;
      await targetClient.query(
        "UPDATE users SET beta_id = $1, qr_token = $2 WHERE id = $3",
        [betaId, qrToken, u.id]
      );
    }
    if (usersRes.rowCount > 0) {
      console.log(`✅ Backfilled ${usersRes.rowCount} users with unique Beta IDs and QR tokens.`);
    }

  } catch (err) {
    console.error('❌ Database initialization error:', err);
    process.exit(1);
  } finally {
    await targetClient.end();
    console.log('Database initialization connection closed.');
  }
}

run();
