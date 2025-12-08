const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Claim = sequelize.define('Claim', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  policyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'policies',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  ipfsDescriptionCid: {
    type: DataTypes.STRING,
    allowNull: true
  },
  claimIdOnChain: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Submitted', 'In Review', 'Approved', 'Rejected'),
    defaultValue: 'Submitted'
  },
  blockchainTxHash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  privateBlockchainHash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  publicBlockchainHash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mlSeverity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0, max: 100 }
  },
  mlReportCID: {
    type: DataTypes.STRING,
    allowNull: true
  },
  damageParts: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  mlConfidence: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  mlValidationError: {
    type: DataTypes.STRING,
    allowNull: true
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  fabricVerificationCID: {
    type: DataTypes.STRING,
    allowNull: true
  },
  payoutAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  payoutStatus: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Paid', 'Rejected'),
    defaultValue: 'Pending'
  },
  blockchainEvaluated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Automation fields
  autoDecision: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  autoDecisionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  autoDecisionAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  autoDecisionConfidence: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'claims',
  timestamps: true,
  hooks: {
    beforeUpdate: (claim) => {
      if (claim.changed('status')) {
        claim.updatedAt = new Date();
      }
    }
  }
});

module.exports = Claim;

