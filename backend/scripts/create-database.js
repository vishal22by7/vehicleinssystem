const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: 'postgres' // Connect to default postgres database first
});

async function createDatabase() {
  try {
    console.log('🔄 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Check if database already exists
    const checkResult = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'vims'"
    );

    if (checkResult.rows.length > 0) {
      console.log('ℹ️  Database "vims" already exists');
      console.log('✅ You can proceed with migration');
      await client.end();
      return;
    }

    // Create database
    console.log('🔄 Creating database "vims"...');
    await client.query('CREATE DATABASE vims');
    console.log('✅ Database "vims" created successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Run: npm run migrate');
    console.log('   2. Run: npm run test:db');
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Error Details:');
    console.error('   Message:', error.message || 'Unknown error');
    console.error('   Code:', error.code || 'N/A');
    console.error('');
    
    if (error.message && error.message.includes('password authentication failed')) {
      console.error('💡 Solution: Password authentication failed');
      console.error('   Check your password in backend/.env');
      console.error('   Current DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'NOT SET');
      console.error('   Make sure it matches your PostgreSQL password');
    } else if (error.code === 'ECONNREFUSED' || error.message && error.message.includes('ECONNREFUSED')) {
      console.error('💡 Solution: Cannot connect to PostgreSQL');
      console.error('   1. Make sure PostgreSQL is running');
      console.error('   2. Check Windows Services: services.msc');
      console.error('   3. Look for "postgresql" service and start it');
      console.error('   4. Verify connection settings:');
      console.error('      Host:', process.env.DB_HOST || 'localhost');
      console.error('      Port:', process.env.DB_PORT || '5432');
    } else if (error.message && error.message.includes('database "vims" already exists')) {
      console.log('ℹ️  Database "vims" already exists');
      console.log('✅ You can proceed with migration');
      process.exit(0);
    } else {
      console.error('💡 Troubleshooting:');
      console.error('   1. Verify PostgreSQL is installed and running');
      console.error('   2. Check backend/.env has correct credentials');
      console.error('   3. Try connecting with pgAdmin to verify password');
    }
    
    if (client && !client.ended) {
      await client.end().catch(() => {});
    }
    process.exit(1);
  }
}

createDatabase();

