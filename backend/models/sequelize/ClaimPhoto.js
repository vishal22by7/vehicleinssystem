const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const ClaimPhoto = sequelize.define('ClaimPhoto', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  claimId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'claims',
      key: 'id'
    }
  },
  ipfsCid: {
    type: DataTypes.STRING,
    allowNull: false
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  blockchainIncluded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  uploadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'claim_photos',
  timestamps: true
});

module.exports = ClaimPhoto;

