const { sequelize, testConnection } = require('../config/database');
const {
  User,
  PolicyType,
  Policy,
  Claim,
  ClaimPhoto,
  BlockchainRecord
} = require('../models/sequelize');

async function migrate() {
  try {
    console.log('🔄 Starting PostgreSQL migration...');
    
    // Test connection
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot connect to PostgreSQL. Please check your configuration.');
      process.exit(1);
    }

    // Sync all models (create tables)
    console.log('📦 Creating database tables...');
    await sequelize.sync({ force: false, alter: true });
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Tables created:');
    console.log('   - users');
    console.log('   - policy_types');
    console.log('   - policies');
    console.log('   - claims');
    console.log('   - claim_photos');
    console.log('   - blockchain_records');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrate();

