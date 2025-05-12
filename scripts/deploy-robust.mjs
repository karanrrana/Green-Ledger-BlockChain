import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
  console.log("Starting deployment...");
  
  // Get the network
  const network = await ethers.provider.getNetwork();
  console.log(`Deploying to network: ${network.name} (chainId: ${network.chainId})`);
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  console.log(`Account balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH`);
  
  try {
    // Deploy FacilityHistory first
    console.log("Deploying FacilityHistory...");
    const FacilityHistory = await ethers.getContractFactory("FacilityHistory");
    const facilityHistory = await FacilityHistory.deploy();
    
    console.log("Waiting for FacilityHistory deployment transaction to be mined...");
    await facilityHistory.waitForDeployment();
    const facilityHistoryAddress = await facilityHistory.getAddress();
    console.log("FacilityHistory deployed to:", facilityHistoryAddress);

    // Deploy WasteManagement
    console.log("Deploying WasteManagement...");
    const WasteManagement = await ethers.getContractFactory("WasteManagement");
    const wasteManagement = await WasteManagement.deploy();
    
    console.log("Waiting for WasteManagement deployment transaction to be mined...");
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
  } catch (error) {
    console.error("Deployment error details:", error);
    
    // More detailed error information
    if (error.code === 'NETWORK_ERROR') {
      console.error("Network error. Check your internet connection and RPC URL.");
    } else if (error.code === 'TIMEOUT') {
      console.error("Deployment timed out. The network might be congested.");
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error("Insufficient funds. Make sure your account has enough ETH.");
    } else {
      console.error("Unknown error. Check your configuration and try again.");
    }
    
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});