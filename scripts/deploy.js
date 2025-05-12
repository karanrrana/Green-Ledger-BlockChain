const hre = require("hardhat");

async function main() {
  // Deploy FacilityHistory first (if it's a separate contract)
  const FacilityHistory = await hre.ethers.getContractFactory("FacilityHistory");
  const facilityHistory = await FacilityHistory.deploy();
  await facilityHistory.deployed();
  console.log("FacilityHistory deployed to:", facilityHistory.address);

  // Deploy WasteManagement
  const WasteManagement = await hre.ethers.getContractFactory("WasteManagement");
  const wasteManagement = await WasteManagement.deploy();
  await wasteManagement.deployed();
  console.log("WasteManagement deployed to:", wasteManagement.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});