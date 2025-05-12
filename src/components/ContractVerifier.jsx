import React, { useState } from 'react';
import { Web3 } from 'web3'; // Note the curly braces for v4.x
import { WASTE_MANAGEMENT_ADDRESS } from "../config";

function ContractVerifier() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const verifyContract = async () => {
    setLoading(true);
    try {
      // Initialize web3
      let web3;
      if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      } else {
        // Fallback to HTTP provider
        web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
      }
      
      // Get network info
      const networkId = await web3.eth.net.getId();
      const networkType = await web3.eth.net.getNetworkType();
      
      // Check if contract exists
      const code = await web3.eth.getCode(WASTE_MANAGEMENT_ADDRESS);
      const contractExists = code !== '0x' && code !== '0x0';
      
      // Get accounts
      const accounts = await web3.eth.getAccounts();
      
      setResult({
        networkId,
        networkType,
        contractAddress: WASTE_MANAGEMENT_ADDRESS,
        contractExists,
        contractCode: code.substring(0, 100) + '...',
        accounts: accounts.slice(0, 3)
      });
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-md">
      <h2 className="text-xl font-bold mb-4">Contract Verification Tool</h2>
      
      <button
        onClick={verifyContract}
        disabled={loading}
        className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? 'Checking...' : 'Verify Contract'}
      </button>
      
      {result && (
        <div className="mt-4">
          <h3 className="font-bold text-lg mb-2">Results:</h3>
          
          {result.error ? (
            <div className="p-3 bg-red-100 text-red-700 rounded">
              Error: {result.error}
            </div>
          ) : (
            <div className="space-y-2">
              <p><span className="font-semibold">Network ID:</span> {result.networkId}</p>
              <p><span className="font-semibold">Network Type:</span> {result.networkType}</p>
              <p><span className="font-semibold">Contract Address:</span> {result.contractAddress}</p>
              <p><span className="font-semibold">Contract Exists:</span> {result.contractExists ? 
                <span className="text-green-600">Yes</span> : 
                <span className="text-red-600">No</span>}
              </p>
              
              {result.contractExists && (
                <div>
                  <p><span className="font-semibold">Contract Code:</span></p>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                    {result.contractCode}
                  </pre>
                </div>
              )}
              
              <div>
                <p><span className="font-semibold">Available Accounts:</span></p>
                <ul className="list-disc pl-5">
                  {result.accounts.map((account, index) => (
                    <li key={index} className="text-sm font-mono">{account}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ContractVerifier;
