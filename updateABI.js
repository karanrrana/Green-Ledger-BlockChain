// This is a CommonJS script - save it in the root directory, not in src
const fs = require('fs');
const path = require('path');

// Path to the artifact file
const artifactPath = path.join(__dirname, 'artifacts/contracts/WasteManagement.sol/WasteManagement.json');

// Path to your ABI.json file
const abiOutputPath = path.join(__dirname, 'src/ABI.json');

try {
  console.log('Looking for artifact at:', artifactPath);
  
  // Check if the artifact file exists
  if (!fs.existsSync(artifactPath)) {
    console.error('Artifact file not found. Make sure you have compiled your contracts.');
    process.exit(1);
  }
  
  // Read the artifact file
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  
  // Extract the ABI
  const abi = artifact.abi;
  
  // Write the ABI to your ABI.json file
  fs.writeFileSync(abiOutputPath, JSON.stringify(abi, null, 2));
  
  console.log('ABI updated successfully!');
  console.log('ABI contains', abi.length, 'function and event definitions');
  
  // Print a few function names to verify
  console.log('Sample functions:');
  abi.filter(item => item.type === 'function').slice(0, 5).forEach(func => {
    console.log(`- ${func.name}`);
  });
} catch (error) {
  console.error('Error updating ABI:', error);
}