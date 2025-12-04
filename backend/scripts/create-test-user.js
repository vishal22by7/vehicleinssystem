/**
 * Create a test user for login testing
 */
const { User } = require('../models/sequelize');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createTestUser() {
  try {
    // Check if user already exists
    const existing = await User.findOne({ where: { email: 'test@test.com' } });
    if (existing) {
      console.log('✅ Test user already exists');
      console.log('   Email: test@test.com');
      console.log('   Password: test123');
      return;
    }

    // Create test user
    // Note: Password will be hashed by User model hook
    const user = await User.create({
      name: 'Test User',
      email: 'test@test.com',
      passwordHash: 'test123', // Hook will hash this
      phone: '1234567890',
      phoneVerified: true,
      pincode: '123456', // Required: 6 digits
      role: 'user'
    });

    console.log('✅ Test user created successfully!');
    console.log('   Email: test@test.com');
    console.log('   Password: test123');
    console.log('   User ID:', user.id);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.log('ℹ️  User already exists');
    }
    process.exit(1);
  }
}

createTestUser();

