// Create this file to update your ABI.json from artifacts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the artifact file
const artifactPath = path.join(__dirname, '../artifacts/contracts/WasteManagement.sol/WasteManagement.json');

// Path to your ABI.json file
const abiOutputPath = path.join(__dirname, './ABI.json');

try {
  // Read the artifact file
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  
  // Extract the ABI
  const abi = artifact.abi;
  
  // Write the ABI to your ABI.json file
  fs.writeFileSync(abiOutputPath, JSON.stringify(abi, null, 2));
  
  console.log('ABI updated successfully!');
} catch (error) {
  console.error('Error updating ABI:', error);
}


