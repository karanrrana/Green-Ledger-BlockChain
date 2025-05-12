import React, { useState, useEffect } from 'react';
import { Web3 } from 'web3'; // Note the curly braces for v4.x
import ABI from '../ABI.json';
import { WASTE_MANAGEMENT_ADDRESS } from "../config";

function ContractMethodsCheck() {
  const [methodsInfo, setMethodsInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkMethods = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();
      const address = accounts[0];
      
      // Check if contract exists
      const code = await web3.eth.getCode(WASTE_MANAGEMENT_ADDRESS);
      const contractExists = code !== '0x';
      
      if (!contractExists) {
        setError(`No contract found at address: ${WASTE_MANAGEMENT_ADDRESS}`);
        setLoading(false);
        return;
      }
      
      // Get contract methods
      const contract = new web3.eth.Contract(ABI, WASTE_MANAGEMENT_ADDRESS);
      const methods = Object.keys(contract.methods)
        .filter(key => !key.includes('0x')) // Filter out internal methods
        .sort();
      
      // Check specific methods
      const methodsToCheck = [
        'registerFacility',
        'registerHospitalWaste',
        'registerTransportWaste',
        'registerDisposalWaste',
        'getFacility',
        'getHospitalWasteId',
        'getTransportWasteId',
        'getDisposalWasteId',
        'ownsValidFacility',
        'isAuthorizedForFacility'
      ];
      
      const methodStatus = {};
      for (const method of methodsToCheck) {
        methodStatus[method] = methods.includes(method);
      }
      
      setMethodsInfo({
        contractAddress: WASTE_MANAGEMENT_ADDRESS,
        contractExists,
        allMethods: methods,
        methodStatus
      });
    } catch (err) {
      setError(`Error checking methods: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">Contract Methods Check</h2>
      
      <div className="mb-4">
        <button 
          onClick={checkMethods}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Checking...' : 'Check Contract Methods'}
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {methodsInfo && (
        <div className="mb-6">
          <div className="mb-4 p-4 bg-gray-100 rounded-md">
            <h3 className="text-xl font-bold mb-2">Contract Info:</h3>
            <p><strong>Address:</strong> {methodsInfo.contractAddress}</p>
            <p><strong>Contract Exists:</strong> {methodsInfo.contractExists ? 'Yes' : 'No'}</p>
          </div>
          
          <div className="mb-4 p-4 bg-gray-100 rounded-md">
            <h3 className="text-xl font-bold mb-2">Required Methods:</h3>
            <ul className="list-disc pl-5">
              {Object.entries(methodsInfo.methodStatus).map(([method, exists]) => (
                <li key={method} className={exists ? 'text-green-600' : 'text-red-600'}>
                  {method}: {exists ? '✅ Available' : '❌ Missing'}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="p-4 bg-gray-100 rounded-md">
            <h3 className="text-xl font-bold mb-2">All Available Methods:</h3>
            <ul className="list-disc pl-5">
              {methodsInfo.allMethods.map(method => (
                <li key={method}>{method}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContractMethodsCheck;

