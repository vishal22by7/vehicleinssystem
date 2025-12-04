/**
 * Deploy VehicleInsurance.sol contract
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  const VehicleInsurance = await ethers.getContractFactory("VehicleInsurance");
  const vehicleInsurance = await VehicleInsurance.deploy();

  await vehicleInsurance.waitForDeployment();

  const address = await vehicleInsurance.getAddress();
  console.log("✅ VehicleInsurance deployed to:", address);
  console.log("\n📝 Add this to your .env file:");
  console.log(`SMART_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

