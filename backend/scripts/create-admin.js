/**
 * Create Admin User Script (Sequelize/PostgreSQL)
 */
const { User } = require('../models/sequelize');
require('dotenv').config();

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@vims.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const name = process.env.ADMIN_NAME || 'Admin User';

    // Check if admin already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      if (existing.role === 'admin') {
        console.log('✅ Admin user already exists');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
        console.log(`   Role: ${existing.role}`);
        return;
      } else {
        // Update existing user to admin
        await existing.update({ role: 'admin' });
        console.log('✅ Updated existing user to admin');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
        return;
      }
    }

    // Create admin user
    // Password will be hashed by User model hook
    const admin = await User.create({
      name,
      email,
      passwordHash: password, // Hook will hash this
      phone: '9999999999',
      phoneVerified: true,
      pincode: '123456', // Required: 6 digits
      role: 'admin'
    });

    console.log('✅ Admin user created successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: ${name}`);
    console.log(`   User ID: ${admin.id}`);
    console.log('');
    console.log('📝 You can now login with these credentials');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.log('ℹ️  User with this email already exists');
    }
    process.exit(1);
  }
}

createAdmin();
