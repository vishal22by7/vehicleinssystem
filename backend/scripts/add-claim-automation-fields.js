/**
 * Migration script to add automation fields to claims table
 * Run this once: node scripts/add-claim-automation-fields.js
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function addAutomationFields() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Check if columns already exist
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'claims' 
      AND column_name IN ('autoDecision', 'autoDecisionReason', 'autoDecisionAt', 'autoDecisionConfidence')
    `);

    const existingColumns = results.map(r => r.column_name);
    
    if (existingColumns.length === 4) {
      console.log('✅ Automation fields already exist. Skipping migration.');
      await sequelize.close();
      process.exit(0);
    }

    console.log('📝 Adding automation fields to claims table...\n');

    // Add autoDecision (boolean)
    if (!existingColumns.includes('autoDecision')) {
      await sequelize.query(`
        ALTER TABLE claims 
        ADD COLUMN "autoDecision" BOOLEAN DEFAULT false
      `);
      console.log('✅ Added autoDecision column');
    }

    // Add autoDecisionReason (text)
    if (!existingColumns.includes('autoDecisionReason')) {
      await sequelize.query(`
        ALTER TABLE claims 
        ADD COLUMN "autoDecisionReason" TEXT
      `);
      console.log('✅ Added autoDecisionReason column');
    }

    // Add autoDecisionAt (timestamp)
    if (!existingColumns.includes('autoDecisionAt')) {
      await sequelize.query(`
        ALTER TABLE claims 
        ADD COLUMN "autoDecisionAt" TIMESTAMP
      `);
      console.log('✅ Added autoDecisionAt column');
    }

    // Add autoDecisionConfidence (decimal)
    if (!existingColumns.includes('autoDecisionConfidence')) {
      await sequelize.query(`
        ALTER TABLE claims 
        ADD COLUMN "autoDecisionConfidence" DECIMAL(5,2)
      `);
      console.log('✅ Added autoDecisionConfidence column');
    }

    console.log('\n🎉 Migration completed successfully!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

addAutomationFields();

