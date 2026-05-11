import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/leadsai_db';

async function test() {
  console.log('Connecting to:', connectionString);
  const sql = postgres(connectionString, { connect_timeout: 5 });
  try {
    const result = await sql`SELECT 1 as test`;
    console.log('Success:', result);
  } catch (err) {
    console.error('Failed:', err);
  } finally {
    await sql.end();
  }
}

test();
