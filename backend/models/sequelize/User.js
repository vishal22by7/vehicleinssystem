const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
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
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    lowercase: true,
    validate: {
      isEmail: true
    }
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(10),
    allowNull: true,
    unique: true,
    validate: {
      len: [10, 10],
      isNumeric: true
    }
  },
  phoneVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  otpCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  otpExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  dateOfBirth: {
    type: DataTypes.DATE,
    allowNull: true
  },
  gender: {
    type: DataTypes.ENUM('M', 'F', 'Others'),
    allowNull: true
  },
  maritalStatus: {
    type: DataTypes.ENUM('Single', 'Married', 'Divorced', 'Widowed'),
    allowNull: true
  },
  addressLine1: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },
  addressLine2: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },
  landmark: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },
  pincode: {
    type: DataTypes.STRING(6),
    allowNull: true,
    defaultValue: '',
    validate: {
      len: [6, 6],
      isNumeric: true
    }
  },
  alternativeMobile: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },
  kycStatus: {
    type: DataTypes.ENUM('Not Started', 'Pending', 'Verified', 'Rejected'),
    defaultValue: 'Not Started'
  },
  pan: {
    type: DataTypes.STRING(10),
    allowNull: true,
    validate: {
      len: [10, 10],
      is: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    }
  },
  kycIdType: {
    type: DataTypes.ENUM('Aadhaar', 'Passport', 'Driving License', 'Voter ID'),
    allowNull: true
  },
  kycIdNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  nomineeName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },
  nomineeRelation: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },
  nomineeDateOfBirth: {
    type: DataTypes.DATE,
    allowNull: true
  },
  nomineeIsMinor: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  appointeeName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },
  appointeeRelation: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },
  termsAccepted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  marketingConsent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  termsAcceptedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.passwordHash) {
        user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('passwordHash') && user.passwordHash) {
        user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
      }
    }
  },
  defaultScope: {
    attributes: { exclude: ['passwordHash'] }
  }
});

module.exports = User;

