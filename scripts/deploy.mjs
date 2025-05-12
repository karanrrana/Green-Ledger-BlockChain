import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
  console.log("Starting deployment...");
  
  // Deploy FacilityHistory first
  console.log("Deploying FacilityHistory...");
  const FacilityHistory = await ethers.getContractFactory("FacilityHistory");
  const facilityHistory = await FacilityHistory.deploy();
  await facilityHistory.waitForDeployment();
  const facilityHistoryAddress = await facilityHistory.getAddress();
  console.log("FacilityHistory deployed to:", facilityHistoryAddress);

  // Deploy WasteManagement
  console.log("Deploying WasteManagement...");
  const WasteManagement = await ethers.getContractFactory("WasteManagement");
  const wasteManagement = await WasteManagement.deploy();
  await wasteManagement.waitForDeployment();
  const wasteManagementAddress = await wasteManagement.getAddress();
  console.log("WasteManagement deployed to:", wasteManagementAddress);
  
  console.log("Deployment completed successfully!");
  console.log("------------------------------------");
  console.log("Contract Addresses:");
  console.log("FacilityHistory:", facilityHistoryAddress);
  console.log("WasteManagement:", wasteManagementAddress);
  console.log("------------------------------------");
  console.log("Don't forget to update your config.js file with the new WasteManagement address!");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});

