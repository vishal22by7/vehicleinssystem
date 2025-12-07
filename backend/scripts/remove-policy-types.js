const { sequelize, PolicyType, Policy, Claim, ClaimPhoto, BlockchainRecord } = require('../models/sequelize');

// Policy types to remove
const policyTypesToRemove = [
  'Commercial Passenger Bus Package',
  'Pay-as-You-Drive Private Car',
  'Commercial Vehicle Package – Goods Carrier',
  'Taxi & Fleet Comprehensive'
];

async function removePolicyTypes() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL\n');

    for (const policyTypeName of policyTypesToRemove) {
      console.log(`\n🔍 Processing: ${policyTypeName}`);
      
      // Find the policy type
      const policyType = await PolicyType.findOne({
        where: { name: policyTypeName }
      });

      if (!policyType) {
        console.log(`   ⚠️  Policy type not found, skipping...`);
        continue;
      }

      console.log(`   📋 Found policy type with ID: ${policyType.id}`);

      // Check for policies using this type
      const policiesCount = await Policy.count({
        where: { policyTypeId: policyType.id }
      });

      if (policiesCount > 0) {
        console.log(`   ⚠️  Found ${policiesCount} policy/policies using this type`);
        
        // Get all policies
        const policies = await Policy.findAll({
          where: { policyTypeId: policyType.id }
        });

        // Check for claims associated with these policies
        let totalClaims = 0;
        for (const policy of policies) {
          const claimsCount = await Claim.count({
            where: { policyId: policy.id }
          });
          totalClaims += claimsCount;
        }

        if (totalClaims > 0) {
          console.log(`   ⚠️  Found ${totalClaims} claim(s) associated with these policies`);
          console.log(`   🗑️  Deleting claim photos and claims...`);
          
          // Get all claims first
          const allClaims = [];
          for (const policy of policies) {
            const claims = await Claim.findAll({
              where: { policyId: policy.id }
            });
            allClaims.push(...claims);
          }
          
          // Delete claim photos first
          for (const claim of allClaims) {
            await ClaimPhoto.destroy({
              where: { claimId: claim.id }
            });
          }
          console.log(`   ✅ Deleted all associated claim photos`);
          
          // Delete claims
          for (const policy of policies) {
            await Claim.destroy({
              where: { policyId: policy.id }
            });
          }
          console.log(`   ✅ Deleted all associated claims`);
        }

        console.log(`   🗑️  Deleting blockchain records and policies...`);
        
        // Delete blockchain records for these policies
        for (const policy of policies) {
          await BlockchainRecord.destroy({
            where: {
              entityType: 'Policy',
              entityId: policy.id
            }
          });
        }
        console.log(`   ✅ Deleted all associated blockchain records`);
        
        // Delete policies
        await Policy.destroy({
          where: { policyTypeId: policyType.id }
        });
        console.log(`   ✅ Deleted all associated policies`);
      }

      // Delete the policy type
      console.log(`   🗑️  Deleting policy type...`);
      await policyType.destroy();
      console.log(`   ✅ Successfully removed: ${policyTypeName}`);
    }

    console.log('\n🎉 All specified policy types removed successfully!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing policy types:', error);
    console.error('Stack:', error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

removePolicyTypes();

