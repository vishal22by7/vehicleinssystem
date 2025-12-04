const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const BlockchainRecord = sequelize.define('BlockchainRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  entityType: {
    type: DataTypes.ENUM('Policy', 'Claim'),
    allowNull: false
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  txHash: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  blockNumber: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  eventName: {
    type: DataTypes.ENUM('PolicyIssued', 'ClaimSubmitted', 'ClaimStatusUpdated', 'ClaimEvaluated'),
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false
  },
  blockchainType: {
    type: DataTypes.ENUM('Public', 'Private', 'Both'),
    defaultValue: 'Public'
  },
  privateBlockchainHash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  publicBlockchainHash: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'blockchain_records',
  timestamps: true
});

module.exports = BlockchainRecord;

