import React, { useState } from 'react';
import Web3 from 'web3';
import ABI from '../ABI.json';
import { WASTE_MANAGEMENT_ADDRESS } from "../config";

function DebugInfo() {
  const [debugInfo, setDebugInfo] = useState(null);
  const [wasteId, setWasteId] = useState("");
  const [wasteType, setWasteType] = useState("hospital");

  const fetchWasteInfo = async () => {
    if (!wasteId) {
      alert("Please enter a waste ID");
      return;
    }

    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const address = accounts[0];
      const contractAddress = WASTE_MANAGEMENT_ADDRESS;
      const contract = new web3.eth.Contract(ABI, contractAddress);

      let result;
      switch (wasteType) {
        case "hospital":
          result = await contract.methods.getHospitalWasteId(wasteId).call({ from: address });
          break;
        case "transport":
          result = await contract.methods.getTransportWasteId(wasteId).call({ from: address });
          break;
        case "disposal":
          result = await contract.methods.getDisposalWasteId(wasteId).call({ from: address });
          break;
      }

      setDebugInfo(result);
    } catch (error) {
      console.error("Error fetching waste info:", error);
      setDebugInfo({ error: error.message });
    }
  };

  return (
    <div className="mt-8 p-4 border rounded-lg bg-gray-50">
      <h2 className="text-xl font-bold mb-4">Debug Information</h2>
      
      <div className="flex space-x-4 mb-4">
        <select 
          value={wasteType} 
          onChange={(e) => setWasteType(e.target.value)}
          className="border rounded-md px-4 py-2"
        >
          <option value="hospital">Hospital Waste</option>
          <option value="transport">Transport Waste</option>
          <option value="disposal">Disposal Waste</option>
        </select>
        
        <input
          type="number"
          value={wasteId}
          onChange={(e) => setWasteId(e.target.value)}
          placeholder="Enter Waste ID"
          className="border rounded-md px-4 py-2"
        />
        
        <button 
          onClick={fetchWasteInfo}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Fetch Info
        </button>
      </div>
      
      {debugInfo && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">Result:</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default DebugInfo;
