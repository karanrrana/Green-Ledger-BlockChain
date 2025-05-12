const { Web3 } = require('web3'); // Note the curly braces for v4.x
const fs = require('fs');
const path = require('path');

// Read the ABI
const abiPath = path.join(__dirname, 'src/ABI.json');
const ABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

// Contract address from config
const configPath = path.join(__dirname, 'src/config.js');
const configContent = fs.readFileSync(configPath, 'utf8');
const addressMatch = configContent.match(/WASTE_MANAGEMENT_ADDRESS\s*=\s*["']([^"']+)["']/);
const contractAddress = addressMatch ? addressMatch[1] : null;

async function checkContract() {
  console.log('Checking contract at address:', contractAddress);
  
  if (!contractAddress) {
    console.error('Could not find contract address in config.js');
    return;
  }
  
  // Connect to local Hardhat node - try both localhost and 127.0.0.1
  const web3 = new Web3('http://127.0.0.1:8545');
  
  try {
    // Check if we can connect
    const blockNumber = await web3.eth.getBlockNumber();
    console.log('Connected to blockchain. Current block number:', blockNumber);
    
    // Check if contract exists
    const code = await web3.eth.getCode(contractAddress);
    if (code === '0x' || code === '0x0') {
      console.error('No contract found at address:', contractAddress);
      console.log('Make sure your Hardhat node is running and the contract is deployed.');
      return;
    }
    
    console.log('Contract exists at address:', contractAddress);
    
    // Try to instantiate the contract
    const contract = new web3.eth.Contract(ABI, contractAddress);
    
    // Check some methods
    const methods = Object.keys(contract.methods)
      .filter(key => !key.includes('0x'))
      .sort();
    
    console.log('Available methods:', methods);
    
    // Get accounts
    const accounts = await web3.eth.getAccounts();
    console.log('Available accounts:', accounts.slice(0, 3));
    
    // Try to call a view function
    if (methods.includes('getFacilityCount')) {
      const count = await contract.methods.getFacilityCount().call();
      console.log('Facility count:', count);
    }
    
    console.log('Contract check completed successfully!');
  } catch (error) {
    console.error('Error checking contract:', error.message);
  }
}

checkContract();

