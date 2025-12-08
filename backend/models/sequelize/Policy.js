const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Policy = sequelize.define('Policy', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  policyTypeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'policy_types',
      key: 'id'
    }
  },
  vehicleCategory: {
    type: DataTypes.ENUM('2W', '4W', 'Commercial'),
    allowNull: false
  },
  policyType: {
    type: DataTypes.ENUM('TP', 'OD', 'Comprehensive', 'StandaloneOD'),
    allowNull: false
  },
  usageType: {
    type: DataTypes.ENUM('Private', 'Commercial'),
    allowNull: false
  },
  coverType: {
    type: DataTypes.ENUM('New', 'Renewal', 'Transfer'),
    allowNull: false
  },
  premium: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: { min: 0 }
  },
  premiumBreakdown: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  idv: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  ncbPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    validate: { min: 0, max: 50 }
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  vehicleType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  vehicleBrand: {
    type: DataTypes.STRING,
    allowNull: false
  },
  vehicleModel: {
    type: DataTypes.STRING,
    allowNull: false
  },
  variant: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  fuelType: {
    type: DataTypes.ENUM('Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'),
    allowNull: false
  },
  modelYear: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  yearOfRegistration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'yearOfManufacture' // Map to existing database column for backward compatibility
  },
  engineCapacity: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  seatingCapacity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  registrationNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isUppercase: true
    }
  },
  registrationDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  rtoState: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rtoCity: {
    type: DataTypes.STRING,
    allowNull: false
  },
  chassisNumber: {
    type: DataTypes.STRING(17),
    allowNull: false,
    validate: {
      is: /^[A-HJ-NPR-Z0-9]{17}$/
    }
  },
  engineNumber: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  isFinanced: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  financierName: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  previousPolicy: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  ownerDetails: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  nominee: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  addOns: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  documents: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  declarations: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  status: {
    type: DataTypes.ENUM('Proposal', 'Issued', 'Active', 'Expired', 'Cancelled', 'Renewed'),
    defaultValue: 'Proposal'
  },
  proposalNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  policyIdOnChain: {
    type: DataTypes.STRING,
    allowNull: true
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
  ipfsCid: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'policies',
  timestamps: true
});

module.exports = Policy;

