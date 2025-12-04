const { sequelize } = require('../../config/database');
const User = require('./User');
const PolicyType = require('./PolicyType');
const Policy = require('./Policy');
const Claim = require('./Claim');
const ClaimPhoto = require('./ClaimPhoto');
const BlockchainRecord = require('./BlockchainRecord');

// Define associations
User.hasMany(Policy, { foreignKey: 'userId', as: 'policies' });
Policy.belongsTo(User, { foreignKey: 'userId', as: 'user' });

PolicyType.hasMany(Policy, { foreignKey: 'policyTypeId', as: 'policies' });
Policy.belongsTo(PolicyType, { foreignKey: 'policyTypeId', as: 'policyTypeRef' }); // Renamed to avoid collision with policyType column

Policy.hasMany(Claim, { foreignKey: 'policyId', as: 'claims' });
Claim.belongsTo(Policy, { foreignKey: 'policyId', as: 'policy' });

User.hasMany(Claim, { foreignKey: 'userId', as: 'claims' });
Claim.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Claim.hasMany(ClaimPhoto, { foreignKey: 'claimId', as: 'photos' });
ClaimPhoto.belongsTo(Claim, { foreignKey: 'claimId', as: 'claim' });

User.hasMany(PolicyType, { foreignKey: 'createdBy', as: 'createdPolicyTypes' });
PolicyType.belongsTo(User, { foreignKey: 'createdBy', as: 'createdByUser' });

module.exports = {
  sequelize,
  User,
  PolicyType,
  Policy,
  Claim,
  ClaimPhoto,
  BlockchainRecord
};

