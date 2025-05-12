import React, { useState } from 'react';
import { Web3 } from 'web3'; // Note the curly braces for v4.x
import ABI from '../ABI.json';
import { WASTE_MANAGEMENT_ADDRESS } from "../config";

function ContractDebug() {
  const [result, setResult] = useState(null);

  const checkContract = async () => {
    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const address = accounts[0];
      
      // Check if contract exists
      const code = await web3.eth.getCode(WASTE_MANAGEMENT_ADDRESS);
      const contractExists = code !== '0x';
      
      // Try to instantiate contract
      const contract = new web3.eth.Contract(ABI, WASTE_MANAGEMENT_ADDRESS);
      
      // Try to call a simple view function
      let facilityInfo = null;
      try {
        facilityInfo = await contract.methods.facilities(address).call();
      } catch (e) {
        console.error("Error calling facilities:", e);
      }
      
      setResult({
        contractAddress: WASTE_MANAGEMENT_ADDRESS,
        contractExists,
        connectedAccount: address,
        facilityInfo
      });
    } catch (error) {
      console.error("Debug error:", error);
      setResult({ error: error.message });
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
      <h2 className="text-xl font-bold mb-2">Contract Debug</h2>
      <button 
        onClick={checkContract}
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
      >
        Check Contract
      </button>
      
      {result && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">Result:</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default ContractDebug;



