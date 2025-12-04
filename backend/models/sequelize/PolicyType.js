const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const PolicyType = sequelize.define('PolicyType', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    trim: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  baseRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  ageFactor: {
    type: DataTypes.DECIMAL(5, 3),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  engineFactor: {
    type: DataTypes.DECIMAL(5, 3),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  addOns: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'policy_types',
  timestamps: true
});

module.exports = PolicyType;

