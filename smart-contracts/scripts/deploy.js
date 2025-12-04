const hre = require("hardhat");

async function main() {
  console.log("Deploying InsuranceLedger contract...");

  const InsuranceLedger = await hre.ethers.getContractFactory("InsuranceLedger");
  const insuranceLedger = await InsuranceLedger.deploy();

  await insuranceLedger.waitForDeployment();

  const address = await insuranceLedger.getAddress();
  console.log("✅ InsuranceLedger deployed to:", address);
  console.log("\n📝 Add this to your backend/.env file:");
  console.log(`SMART_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

