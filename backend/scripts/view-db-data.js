/**
 * View all data in the database
 * Usage: node scripts/view-db-data.js [table_name]
 * 
 * Examples:
 *   node scripts/view-db-data.js              # View all tables
 *   node scripts/view-db-data.js users        # View only users table
 *   node scripts/view-db-data.js policies     # View only policies table
 */

const { sequelize } = require('../config/database');
const { User, Policy, Claim, PolicyType, ClaimPhoto, BlockchainRecord } = require('../models/sequelize');
require('dotenv').config();

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function formatTable(data, title) {
  if (!data || data.length === 0) {
    console.log(colorize(`\n📋 ${title}: No data found`, 'yellow'));
    return;
  }

  console.log(colorize(`\n${'='.repeat(80)}`, 'cyan'));
  console.log(colorize(`📋 ${title} (${data.length} record${data.length !== 1 ? 's' : ''})`, 'bright'));
  console.log(colorize('='.repeat(80), 'cyan'));
  
  // Display as JSON for readability
  console.log(JSON.stringify(data, null, 2));
}

async function viewUsers() {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['passwordHash'] }, // Don't show password hash
      order: [['createdAt', 'DESC']]
    });
    formatTable(users.map(u => u.toJSON()), 'USERS');
  } catch (error) {
    console.error(colorize(`❌ Error fetching users: ${error.message}`, 'red'));
  }
}

async function viewPolicies() {
  try {
    const policies = await Policy.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: PolicyType, as: 'policyTypeRef', attributes: ['id', 'name', 'description'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    formatTable(policies.map(p => p.toJSON()), 'POLICIES');
  } catch (error) {
    console.error(colorize(`❌ Error fetching policies: ${error.message}`, 'red'));
  }
}

async function viewClaims() {
  try {
    const claims = await Claim.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: Policy, as: 'policy', attributes: ['id', 'policyNumber', 'vehicleType'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    formatTable(claims.map(c => c.toJSON()), 'CLAIMS');
  } catch (error) {
    console.error(colorize(`❌ Error fetching claims: ${error.message}`, 'red'));
  }
}

async function viewPolicyTypes() {
  try {
    const policyTypes = await PolicyType.findAll({
      order: [['createdAt', 'DESC']]
    });
    formatTable(policyTypes.map(pt => pt.toJSON()), 'POLICY TYPES');
  } catch (error) {
    console.error(colorize(`❌ Error fetching policy types: ${error.message}`, 'red'));
  }
}

async function viewClaimPhotos() {
  try {
    const photos = await ClaimPhoto.findAll({
      include: [{ model: Claim, as: 'claim', attributes: ['id', 'claimNumber'] }],
      order: [['createdAt', 'DESC']]
    });
    formatTable(photos.map(photo => photo.toJSON()), 'CLAIM PHOTOS');
  } catch (error) {
    console.error(colorize(`❌ Error fetching claim photos: ${error.message}`, 'red'));
  }
}

async function viewBlockchainRecords() {
  try {
    const records = await BlockchainRecord.findAll({
      order: [['createdAt', 'DESC']]
    });
    formatTable(records.map(r => r.toJSON()), 'BLOCKCHAIN RECORDS');
  } catch (error) {
    console.error(colorize(`❌ Error fetching blockchain records: ${error.message}`, 'red'));
  }
}

async function viewIPFSFiles() {
  try {
    // IPFSFile model doesn't exist in the current setup
    console.log(colorize(`\n📋 IPFS FILES: Model not implemented`, 'yellow'));
  } catch (error) {
    console.error(colorize(`❌ Error fetching IPFS files: ${error.message}`, 'red'));
  }
}

async function viewTableStats() {
  try {
    const stats = {
      users: await User.count(),
      policies: await Policy.count(),
      claims: await Claim.count(),
      policyTypes: await PolicyType.count(),
      claimPhotos: await ClaimPhoto.count(),
      blockchainRecords: await BlockchainRecord.count()
    };

    console.log(colorize(`\n${'='.repeat(80)}`, 'cyan'));
    console.log(colorize('📊 DATABASE STATISTICS', 'bright'));
    console.log(colorize('='.repeat(80), 'cyan'));
    console.log(JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error(colorize(`❌ Error fetching statistics: ${error.message}`, 'red'));
  }
}

async function main() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log(colorize('✅ Connected to PostgreSQL database', 'green'));
    console.log(colorize(`📁 Database: ${process.env.DB_NAME || 'vims'}`, 'cyan'));

    const tableName = process.argv[2]?.toLowerCase();

    if (!tableName) {
      // View all tables
      await viewTableStats();
      await viewUsers();
      await viewPolicies();
      await viewClaims();
      await viewPolicyTypes();
      await viewClaimPhotos();
      await viewBlockchainRecords();
    } else {
      // View specific table
      switch (tableName) {
        case 'users':
        case 'user':
          await viewUsers();
          break;
        case 'policies':
        case 'policy':
          await viewPolicies();
          break;
        case 'claims':
        case 'claim':
          await viewClaims();
          break;
        case 'policytypes':
        case 'policy-types':
        case 'policytype':
          await viewPolicyTypes();
          break;
        case 'claimphotos':
        case 'claim-photos':
        case 'claimphoto':
          await viewClaimPhotos();
          break;
        case 'blockchain':
        case 'blockchainrecords':
        case 'blockchain-record':
          await viewBlockchainRecords();
          break;
        case 'stats':
        case 'statistics':
          await viewTableStats();
          break;
        default:
          console.log(colorize(`❌ Unknown table: ${tableName}`, 'red'));
          console.log(colorize('\nAvailable tables:', 'yellow'));
          console.log('  - users');
          console.log('  - policies');
          console.log('  - claims');
          console.log('  - policytypes');
          console.log('  - claimphotos');
          console.log('  - blockchain');
          console.log('  - stats');
          process.exit(1);
      }
    }

    console.log(colorize('\n✅ Done!', 'green'));
    process.exit(0);
  } catch (error) {
    console.error(colorize(`❌ Error: ${error.message}`, 'red'));
    console.error(error);
    process.exit(1);
  }
}

main();

