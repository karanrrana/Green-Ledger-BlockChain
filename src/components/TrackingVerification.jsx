import React, { useState } from 'react';
import Web3 from 'web3';
import { PREFIXES } from '../utils/uidGenerator';
import ABI from "../ABI.json";

function TrackingVerification() {
  const [searchUID, setSearchUID] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [error, setError] = useState('');

  const validateUID = (uid) => {
    // Check if UID matches the expected format
    const prefixPattern = `^(${Object.values(PREFIXES).join('|')})_[a-z0-9]+_[a-z0-9]+$`;
    const regex = new RegExp(prefixPattern);
    return regex.test(uid);
  };

  const getUIDType = (uid) => {
    const prefix = uid.split('_')[0];
    switch (prefix) {
      case PREFIXES.SEGREGATION: return 'Segregation';
      case PREFIXES.TRANSPORT: return 'Transport';
      case PREFIXES.DISPOSAL: return 'Disposal';
      case PREFIXES.FACILITY: return 'Facility';
      default: return 'Unknown';
    }
  };

  const trackUID = async () => {
    setError('');
    setTrackingResult(null);

    if (!validateUID(searchUID)) {
      setError('Invalid UID format');
      return;
    }

    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      const address = accounts[0];
      const contractAddress = "0x87f2aceEf4fdd5fC1aAe23a310cE09422F979800";
      const contract = new web3.eth.Contract(ABI, contractAddress);

      const uidType = getUIDType(searchUID);
      let result = {};

      switch (uidType) {
        case 'Segregation':
          result = await contract.methods.getHospitalWasteId(searchUID).call({ from: address });
          break;
        case 'Transport':
          result = await contract.methods.getTransportWasteId(searchUID).call({ from: address });
          break;
        case 'Disposal':
          result = await contract.methods.getDisposalWasteId(searchUID).call({ from: address });
          break;
        case 'Facility':
          result = await contract.methods.getFacility(searchUID).call({ from: address });
          break;
      }

      setTrackingResult({
        type: uidType,
        data: result,
        timestamp: new Date().toLocaleString()
      });
    } catch (error) {
      setError(`Error tracking UID: ${error.message}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4">Track Waste Management UID</h2>

      <div className="mb-4">
        <input
          type="text"
          value={searchUID}
          onChange={(e) => setSearchUID(e.target.value)}
          placeholder="Enter UID to track"
          className="border rounded-md px-4 py-2 w-full"
        />
      </div>

      <button
        onClick={trackUID}
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
      >
        Track UID
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {trackingResult && (
        <div className="mt-4 p-4 bg-green-100 rounded-md">
          <h3 className="font-bold">Tracking Result:</h3>
          <p>Type: {trackingResult.type}</p>
          <p>Timestamp: {trackingResult.timestamp}</p>
          <pre className="mt-2 bg-gray-100 p-2 rounded">
            {JSON.stringify(trackingResult.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default TrackingVerification;
