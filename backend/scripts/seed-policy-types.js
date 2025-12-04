const { PolicyType } = require('../models/sequelize');
const { sequelize } = require('../config/database');
require('dotenv').config();

const policyTypes = [
  {
    name: 'Third-Party Liability (TP)',
    description: 'IRDAI-mandated third-party liability cover for damages to life or property.',
    baseRate: 4000,
    ageFactor: 0.01,
    engineFactor: 0.002,
    addOns: {}
  },
  {
    name: 'Comprehensive Private Car',
    description: 'Full cover including own damage, third-party liability, and PA cover.',
    baseRate: 9500,
    ageFactor: 0.015,
    engineFactor: 0.003,
    addOns: {
      'Zero Depreciation': 0.2,
      'Engine Protect': 0.08,
      'Roadside Assistance': 0.05
    }
  },
  {
    name: 'Stand-Alone Own Damage (OD)',
    description: 'Own damage-only policy when TP policy already exists.',
    baseRate: 6500,
    ageFactor: 0.012,
    engineFactor: 0.0025,
    addOns: {
      'Zero Depreciation': 0.18,
      'Consumables Cover': 0.04
    }
  },
  {
    name: 'Commercial Vehicle Package – Goods Carrier',
    description: 'Comprehensive cover for light commercial goods carriers.',
    baseRate: 12000,
    ageFactor: 0.018,
    engineFactor: 0.0035,
    addOns: {
      'Hull Damage Cover': 0.06,
      'Legal Liability Driver/Conductor': 0.03
    }
  },
  {
    name: 'Two-Wheeler Comprehensive',
    description: 'Complete protection for motorcycles and scooters.',
    baseRate: 3000,
    ageFactor: 0.008,
    engineFactor: 0.0015,
    addOns: {
      'Zero Depreciation': 0.15,
      'Pillion Rider Cover': 0.05
    }
  },
  {
    name: 'Zero-Depreciation Premium Plan',
    description: 'High-end plan for cars under five years with full depreciation waiver.',
    baseRate: 13000,
    ageFactor: 0.02,
    engineFactor: 0.004,
    addOns: {
      'Zero Depreciation': 0.3,
      'Return to Invoice': 0.1,
      'Tyre Protect': 0.05
    }
  },
  {
    name: 'Electric Vehicle Comprehensive',
    description: 'EV-specific plan covering traction battery, charger, and own damage.',
    baseRate: 10500,
    ageFactor: 0.013,
    engineFactor: 0.0028,
    addOns: {
      'Battery Protect': 0.12,
      'Charger Cover': 0.06,
      'Roadside Assistance': 0.05
    }
  },
  {
    name: 'Pay-as-You-Drive Private Car',
    description: 'Usage-based plan for private cars with telematics-based discounts.',
    baseRate: 7500,
    ageFactor: 0.011,
    engineFactor: 0.002,
    addOns: {
      'Zero Depreciation': 0.18,
      'Daily Allowance': 0.03
    }
  },
  {
    name: 'Two-Wheeler Third-Party – 5 Year',
    description: 'Long-term TP plan for new two-wheelers as per IRDAI mandate.',
    baseRate: 5200,
    ageFactor: 0.005,
    engineFactor: 0.001,
    addOns: {}
  },
  {
    name: 'Commercial Passenger Bus Package',
    description: 'All-inclusive cover for tourist and city passenger buses.',
    baseRate: 18500,
    ageFactor: 0.02,
    engineFactor: 0.0045,
    addOns: {
      'Personal Accident Driver': 0.04,
      'Passenger Liability': 0.05,
      'Loss of Revenue': 0.06
    }
  },
  {
    name: 'Taxi & Fleet Comprehensive',
    description: 'Aggregated cover for yellow-plate taxis and ride-sharing fleets.',
    baseRate: 14000,
    ageFactor: 0.017,
    engineFactor: 0.0032,
    addOns: {
      'Legal Liability Paid Driver': 0.03,
      'Engine Protect': 0.07
    }
  }
];

async function seedPolicyTypes() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL');

    for (const policy of policyTypes) {
      const [policyType, created] = await PolicyType.findOrCreate({
        where: { name: policy.name },
        defaults: {
          description: policy.description,
          baseRate: policy.baseRate,
          ageFactor: policy.ageFactor,
          engineFactor: policy.engineFactor,
          addOns: policy.addOns
        }
      });

      if (!created) {
        await policyType.update({
          description: policy.description,
          baseRate: policy.baseRate,
          ageFactor: policy.ageFactor,
          engineFactor: policy.engineFactor,
          addOns: policy.addOns
        });
      }
      console.log(`${created ? '✔️  Created' : '🔄 Updated'} policy type: ${policy.name}`);
    }

    console.log('\n🎉 Policy types seeded successfully!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding policy types:', error.message);
    process.exit(1);
  }
}

seedPolicyTypes();

