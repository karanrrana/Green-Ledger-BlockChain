import React from 'react'
import Navbar from './Navbar';
import { useState, useEffect } from "react"
import { Web3 } from 'web3'; // Note the curly braces for v4.x
import ABI from "../ABI.json"
import { isWalletConnected } from "../walletConfig";
import { WASTE_MANAGEMENT_ADDRESS } from "../config";

function Facility() {
  // Individual state variables for form inputs
  const [facilityNameInput, setFacilityNameInput] = useState("");
  const [facilityTypeInput, setFacilityTypeInput] = useState("");

  // Other state variables
  const [address, setAddress] = useState("");
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [loginHistory, setLoginHistory] = useState([]);
  const [authorizedUsers, setAuthorizedUsers] = useState([]);
  const [newAuthorizedUser, setNewAuthorizedUser] = useState("");
  
  // New state for facility capabilities
  const [capabilities, setCapabilities] = useState({
    canSegregateWaste: false,
    canTransportWaste: false,
    canDisposeWaste: false
  });

  // Function to save login history to localStorage
  const saveLoginHistory = (facilityData) => {
    const history = JSON.parse(localStorage.getItem(`facility_${facilityData.facilityId}_history`) || '[]');
    const newLogin = {
      timestamp: new Date().toISOString(),
      address: address,
      facilityName: facilityData.facilityName,
      facilityType: typeof facilityData.facilityType === 'number' 
        ? getFacilityTypeString(facilityData.facilityType)
        : facilityData.facilityType
    };
    history.unshift(newLogin); // Add new login at the beginning
    // Keep only last 10 logins
    const updatedHistory = history.slice(0, 10);
    localStorage.setItem(`facility_${facilityData.facilityId}_history`, JSON.stringify(updatedHistory));
    setLoginHistory(updatedHistory);
  };

  // Helper function to convert facility type number to string
  const getFacilityTypeString = (typeNumber) => {
    const types = {
      0: "Hospital",
      1: "Transport",
      2: "Treatment",
      3: "Clinic",
      4: "Lab"
    };
    return types[typeNumber] || "Unknown";
  };

  // Add this debugging function
  const debugInputs = () => {
    console.log("Current input values:");
    console.log("Facility Name:", facilityNameInput);
    console.log("Facility Type:", facilityTypeInput);
    console.log("Is wallet connected:", isWalletConnected);
    console.log("Address:", address);
  };

  // Add this useEffect to monitor input changes
  useEffect(() => {
    console.log("Facility name input changed:", facilityNameInput);
  }, [facilityNameInput]);

  // Modify the handleSubmit function
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted");
    debugInputs();
    // Add validation if needed
  };

  // State to track if wallet is connected
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  useEffect(() => {
    const getAddress = async () => {
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum);
        try {
          // Using the newer recommended method
          const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
          });
          const currentAddress = accounts[0];
          setAddress(currentAddress);
          setIsWalletConnected(true);

          // Listen for account changes
          window.ethereum.on('accountsChanged', (newAccounts) => {
            const newAddress = newAccounts[0];
            setAddress(newAddress);
            setIsWalletConnected(!!newAddress);
          });
        } catch (error) {
          console.error('MetaMask error:', error);
        }
      } else {
        console.error('MetaMask not detected');
      }
    };
    getAddress();

    // Cleanup listener on component unmount
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => { });
      }
    };
  }, []);

  let web3;
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
  } else {
    // Fallback to HTTP provider
    web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
    console.log("Using HTTP provider as fallback");
  }
  const contractAddress = WASTE_MANAGEMENT_ADDRESS;
  const contract = new web3.eth.Contract(ABI, contractAddress);

  useEffect(() => {
    // Debug contract methods
    if (contract) {
      console.log("Available contract methods:", Object.keys(contract.methods));
      console.log("Contract address being used:", contractAddress);
      
      // Check if the contract exists at the address
      web3.eth.getCode(contractAddress).then(code => {
        if (code === '0x' || code === '0x0') {
          console.error("No contract found at address:", contractAddress);
        } else {
          console.log("Contract exists at address:", contractAddress);
        }
      });
    }
  }, [contract, contractAddress]);

  // Add this function to check if a specific method exists
  const checkContractMethod = (methodName) => {
    if (!contract || !contract.methods) {
      console.error("Contract or contract.methods is undefined");
      return false;
    }
    
    const exists = !!contract.methods[methodName];
    console.log(`Method ${methodName} exists: ${exists}`);
    return exists;
  };

  useEffect(() => {
    if (contract) {
      checkContractMethod('registerFacility');
      checkContractMethod('getFacilities');
      checkContractMethod('getFacility');
      // Check new capability methods
      checkContractMethod('setFacilityCapability');
      checkContractMethod('enableAllCapabilities');
    }
  }, [contract]);

  const facilityRegistration = async () => {
    try {
      // Check if wallet is connected
      if (!isWalletConnected) {
        alert('Please connect your wallet first');
        return;
      }

      // Validate inputs
      if (!facilityNameInput.trim()) {
        alert('Please enter a facility name');
        return;
      }
      
      const facilityType = parseInt(facilityTypeInput);
      if (isNaN(facilityType) || facilityType < 0 || facilityType > 4) {
        alert('Please enter a valid facility type (0-4)');
        return;
      }

      console.log("Registering facility with address:", address);
      console.log("Using contract at address:", contractAddress);
      console.log("Facility details:", {
        name: facilityNameInput,
        type: facilityType
      });

      // Check if the contract method exists
      if (!contract.methods.registerFacility) {
        alert('Error: registerFacility method not found in contract. Please check your contract deployment.');
        return;
      }

      // Show registration in progress
      alert('Registration in progress. Please wait for the transaction to complete...');

      // Try to estimate gas first to catch errors early
      try {
        await contract.methods.registerFacility(facilityNameInput, facilityType)
          .estimateGas({ from: address });
      } catch (estimateError) {
        console.error("Gas estimation failed:", estimateError);
        alert(`Error: Gas estimation failed. This usually means the contract rejects the transaction. Details: ${estimateError.message}`);
        return;
      }

      // Register the facility with higher gas limit
      const result = await contract.methods.registerFacility(facilityNameInput, facilityType)
        .send({ from: address, gas: 5000000 }); // Increased gas limit
      
      console.log("Registration result:", result);
      
      // Try to extract the facility ID from the event
      let facilityId = null;
      if (result.events && result.events.FacilityRegistered) {
        facilityId = result.events.FacilityRegistered.returnValues.facilityId;
        console.log("New facility ID from event:", facilityId);
      }
      
      // Only proceed with capabilities if we have a facility ID
      if (facilityId) {
        // Ask user if they want to enable capabilities
        const enableCapabilities = window.confirm('Facility registered successfully! Would you like to enable all capabilities (segregation, transport, disposal) for this facility?');
        
        if (enableCapabilities) {
          try {
            // Enable all capabilities
            await contract.methods.enableAllCapabilities(facilityId)
              .send({ from: address, gas: 3000000 });
            
            alert('All capabilities enabled successfully!');
          } catch (error) {
            console.error('Error enabling capabilities:', error);
            alert('Error enabling capabilities. Please try manually from the facility details page.');
          }
        }
      }
      
      // Refresh the facilities list
      fetchFacilities();
      
      // Clear the form
      setFacilityNameInput('');
      setFacilityTypeInput('');
      
      alert('Facility registered successfully!');
    } catch (error) {
      console.error('Error registering facility:', error);
      alert('Error registering facility: ' + error.message);
    }
  };

  const fetchFacilities = async () => {
    try {
      if (!address) return;
      
      console.log("Fetching facilities for address:", address);
      
      // Get all facilities for this address
      const fetchedFacilities = await contract.methods.getFacilities().call({ from: address });
      console.log("Raw fetched facilities:", fetchedFacilities);
      
      // Check the structure of fetchedFacilities to handle it properly
      let facilitiesArray = [];
      
      // If fetchedFacilities is an array of objects with direct properties
      if (Array.isArray(fetchedFacilities) && fetchedFacilities.length > 0) {
        // Check if it's an array of objects or an array with numeric keys
        if (fetchedFacilities[0] && typeof fetchedFacilities[0] === 'object' && !Array.isArray(fetchedFacilities[0])) {
          facilitiesArray = fetchedFacilities;
        } 
        // If it's an array with numeric indices (common in Solidity returns)
        else if ('0' in fetchedFacilities && !isNaN(parseInt(fetchedFacilities[0]))) {
          // Convert numeric array to object array
          const facilityCount = fetchedFacilities.length / 4; // Assuming 4 properties per facility
          
          for (let i = 0; i < facilityCount; i++) {
            facilitiesArray.push({
              facilityId: fetchedFacilities[i * 4],
              facilityName: fetchedFacilities[i * 4 + 1],
              facilityType: fetchedFacilities[i * 4 + 2],
              owner: fetchedFacilities[i * 4 + 3]
            });
          }
        }
      }
      
      console.log("Processed facilities array:", facilitiesArray);
      
      // Format the facilities data
      const formattedFacilities = await Promise.all(facilitiesArray.map(async (facility) => {
        // Get facility capabilities if the method exists
        let capabilities = { canSegregateWaste: false, canTransportWaste: false, canDisposeWaste: false };
        
        if (contract.methods.facilityCapabilities) {
          try {
            capabilities = await contract.methods.facilityCapabilities(facility.facilityId).call();
          } catch (error) {
            console.warn("Could not fetch capabilities:", error);
          }
        }
        
        return {
          facilityId: facility.facilityId.toString(), // Ensure ID is a string
          facilityName: facility.facilityName,
          facilityType: parseInt(facility.facilityType),
          facilityTypeString: getFacilityTypeString(parseInt(facility.facilityType)),
          owner: facility.owner,
          capabilities
        };
      }));
      
      console.log("Formatted facilities:", formattedFacilities);
      setFacilities(formattedFacilities);
    } catch (error) {
      console.error('Error fetching facilities:', error);
      alert('Error fetching facilities: ' + error.message);
    }
  };

  // Add this function to debug the contract's getFacilities method
  const debugGetFacilities = async () => {
    try {
      console.log("Debugging getFacilities method...");
      
      // Check if the method exists
      if (!contract.methods.getFacilities) {
        console.error("getFacilities method does not exist on the contract");
        return;
      }
      
      // Get the method's ABI signature
      const methodAbi = ABI.find(item => 
        item.type === 'function' && item.name === 'getFacilities'
      );
      
      console.log("getFacilities ABI:", methodAbi);
      
      // Try calling the method
      const result = await contract.methods.getFacilities().call({ from: address });
      console.log("getFacilities raw result:", result);
      
      // Log the result type and structure
      console.log("Result type:", typeof result);
      console.log("Is array:", Array.isArray(result));
      
      if (Array.isArray(result)) {
        console.log("Array length:", result.length);
        console.log("First few items:", result.slice(0, 10));
      } else if (typeof result === 'object') {
        console.log("Object keys:", Object.keys(result));
      }
      
      return result;
    } catch (error) {
      console.error("Debug error:", error);
    }
  };

  // Load facilities when address changes
  useEffect(() => {
    if (address) {
      fetchFacilities();
      debugGetFacilities(); // Add this line
    }
  }, [address]);

  // Function to toggle a capability
  const toggleCapability = async (facilityId, capability) => {
    try {
      // Get current capability status
      const facilityCapabilities = await contract.methods.facilityCapabilities(facilityId).call();
      let currentStatus = false;
      
      if (capability === 'segregate') {
        currentStatus = facilityCapabilities.canSegregateWaste;
      } else if (capability === 'transport') {
        currentStatus = facilityCapabilities.canTransportWaste;
      } else if (capability === 'dispose') {
        currentStatus = facilityCapabilities.canDisposeWaste;
      }
      
      // Toggle the capability
      await contract.methods.setFacilityCapability(facilityId, capability, !currentStatus)
        .send({ from: address, gas: 3000000 });
      
      alert(`${capability} capability ${!currentStatus ? 'enabled' : 'disabled'} successfully!`);
      
      // Refresh facilities
      fetchFacilities();
      
      // If a facility is selected, refresh its details
      if (selectedFacility && selectedFacility.facilityId === facilityId) {
        const updatedFacility = await contract.methods.getFacility(facilityId).call();
        const updatedCapabilities = await contract.methods.facilityCapabilities(facilityId).call();
        
        setSelectedFacility({
          ...updatedFacility,
          capabilities: updatedCapabilities
        });
      }
    } catch (error) {
      console.error(`Error toggling ${capability} capability:`, error);
      alert(`Error toggling ${capability} capability: ${error.message}`);
    }
  };

  // Function to select a facility and view its details
  const selectFacility = async (facility) => {
    try {
      // Get the latest facility data
      const facilityData = await contract.methods.getFacility(facility.facilityId).call();
      const facilityCapabilities = await contract.methods.facilityCapabilities(facility.facilityId).call();
      
      const selectedFacilityData = {
        ...facilityData,
        capabilities: facilityCapabilities
      };
      
      setSelectedFacility(selectedFacilityData);
      saveLoginHistory(selectedFacilityData);
      
      // Load authorized users if any
      // This would need to be implemented in the contract
    } catch (error) {
      console.error('Error selecting facility:', error);
      alert('Error selecting facility: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-950 to-gray-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-white">Facility Management</h1>
        
        {/* Wallet Connection Status */}
        <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg mb-6 text-gray-200 shadow-lg">
          <p className="font-semibold">Connected Wallet: {address || 'Not connected'}</p>
          <p className="text-sm mt-1">
            {isWalletConnected 
              ? '✅ Wallet connected. You can register and manage facilities.' 
              : '❌ Please connect your wallet to continue.'}
          </p>
          <p className="text-sm mt-1">
            Contract Address: <span className="text-blue-400">{contractAddress}</span>
          </p>
        </div>
        
        {/* Facility Registration Form */}
        <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">Register New Facility</h2>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">Facility Name:</label>
              <input
                type="text"
                value={facilityNameInput}
                onChange={(e) => setFacilityNameInput(e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter facility name"
                disabled={!isWalletConnected}
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Facility Type:</label>
              <select
                value={facilityTypeInput}
                onChange={(e) => setFacilityTypeInput(e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!isWalletConnected}
              >
                <option value="">Select facility type</option>
                <option value="0">Hospital</option>
                <option value="1">Transport</option>
                <option value="2">Treatment</option>
                <option value="3">Clinic</option>
                <option value="4">Lab</option>
              </select>
            </div>
            <button
              type="button"
              onClick={facilityRegistration}
              className="w-auto bg-blue-500 hover:bg-blue-600 text-white text-lg font-medium py-2 px-4 rounded-md transition-colors duration-200 shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={!isWalletConnected}
            >
              Register Facility
            </button>
          </form>
        </div>
        
        {/* Add this debug section below the form */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-800 border border-gray-700 rounded-lg">
            <h3 className="font-bold mb-2 text-white">Debug Tools</h3>
            <div className="flex space-x-2">
              <button 
                onClick={debugInputs}
                className="bg-gray-700 text-white py-1 px-2 rounded text-sm hover:bg-gray-600"
              >
                Log Input Values
              </button>
              <button 
                onClick={() => setFacilityNameInput("Test Facility " + Date.now())}
                className="bg-gray-700 text-white py-1 px-2 rounded text-sm hover:bg-gray-600"
              >
                Set Test Name
              </button>
            </div>
          </div>
        )}
        
        {/* Facilities List */}
        <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">Your Facilities</h2>
          {facilities.length === 0 ? (
            <p className="text-gray-400">No facilities registered yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {facilities.map((facility) => (
                <div 
                  key={facility.facilityId} 
                  className="border border-gray-700 bg-gray-700 p-4 rounded-lg cursor-pointer hover:bg-gray-600 transition duration-200"
                  onClick={() => selectFacility(facility)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-white">{facility.facilityName}</h3>
                    <span className="bg-blue-900 text-blue-300 text-xs font-medium px-2.5 py-0.5 rounded">
                      ID: {facility.facilityId}
                    </span>
                  </div>
                  
                  <div className="mb-2">
                    <p className="text-sm text-gray-300">
                      <span className="font-medium">Type:</span> {facility.facilityTypeString || getFacilityTypeString(facility.facilityType)}
                    </p>
                    <p className="text-sm text-gray-300 truncate">
                      <span className="font-medium">Owner:</span> {facility.owner}
                    </p>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-400 mb-1">Capabilities:</p>
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center">
                        <span className={`w-4 h-4 mr-2 rounded-full flex items-center justify-center ${facility.capabilities?.canSegregateWaste ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                          {facility.capabilities?.canSegregateWaste ? '✓' : '✗'}
                        </span>
                        <span className="text-sm text-gray-300">Segregation</span>
                      </div>
                      <div className="flex items-center">
                        <span className={`w-4 h-4 mr-2 rounded-full flex items-center justify-center ${facility.capabilities?.canTransportWaste ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                          {facility.capabilities?.canTransportWaste ? '✓' : '✗'}
                        </span>
                        <span className="text-sm text-gray-300">Transport</span>
                      </div>
                      <div className="flex items-center">
                        <span className={`w-4 h-4 mr-2 rounded-full flex items-center justify-center ${facility.capabilities?.canDisposeWaste ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                          {facility.capabilities?.canDisposeWaste ? '✓' : '✗'}
                        </span>
                        <span className="text-sm text-gray-300">Disposal</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Selected Facility Details */}
        {selectedFacility && (
          <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-lg mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">Facility Details</h2>
            <div className="mb-4">
              <h3 className="font-bold text-xl text-white">{selectedFacility.facilityName}</h3>
              <p className="text-gray-300">Type: {getFacilityTypeString(selectedFacility.facilityType)}</p>
              <p className="text-gray-300">ID: {selectedFacility.facilityId}</p>
              <p className="text-gray-300">Owner: {selectedFacility.owner}</p>
            </div>
            
            {/* Capabilities Management */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-2 text-white">Capabilities</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Segregation:</span>
                  <button
                    onClick={() => toggleCapability(selectedFacility.facilityId, 'segregate')}
                    className={`px-3 py-1 rounded ${
                      selectedFacility.capabilities.canSegregateWaste 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    } transition duration-200`}
                  >
                    {selectedFacility.capabilities.canSegregateWaste ? 'Disable' : 'Enable'}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Transport:</span>
                  <button
                    onClick={() => toggleCapability(selectedFacility.facilityId, 'transport')}
                    className={`px-3 py-1 rounded ${
                      selectedFacility.capabilities.canTransportWaste 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    } transition duration-200`}
                  >
                    {selectedFacility.capabilities.canTransportWaste ? 'Disable' : 'Enable'}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Disposal:</span>
                  <button
                    onClick={() => toggleCapability(selectedFacility.facilityId, 'dispose')}
                    className={`px-3 py-1 rounded ${
                      selectedFacility.capabilities.canDisposeWaste 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    } transition duration-200`}
                  >
                    {selectedFacility.capabilities.canDisposeWaste ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Enable all capabilities for this facility?')) {
                    contract.methods.enableAllCapabilities(selectedFacility.facilityId)
                      .send({ from: address, gas: 3000000 })
                      .then(() => {
                        alert('All capabilities enabled successfully!');
                        fetchFacilities();
                        selectFacility(selectedFacility);
                      })
                      .catch(error => {
                        console.error('Error enabling all capabilities:', error);
                        alert('Error enabling all capabilities: ' + error.message);
                      });
                  }
                }}
                className="mt-3 bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700 transition duration-200"
              >
                Enable All Capabilities
              </button>
            </div>
            
            {/* Login History */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-2 text-white">Login History</h3>
              {loginHistory.length === 0 ? (
                <p className="text-gray-400">No login history available.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto bg-gray-700 rounded-lg">
                  {loginHistory.map((login, index) => (
                    <div key={index} className="border-b border-gray-600 p-2">
                      <p className="text-sm text-gray-300">
                        <span className="text-blue-400">{new Date(login.timestamp).toLocaleString()}</span> - 
                        {login.address.substring(0, 6)}...{login.address.substring(login.address.length - 4)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Authorized Users Management */}
            <div>
              <h3 className="font-bold text-lg mb-2 text-white">Authorized Users</h3>
              <div className="flex mb-3">
                <input
                  type="text"
                  value={newAuthorizedUser}
                  onChange={(e) => setNewAuthorizedUser(e.target.value)}
                  className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-l text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter wallet address"
                />
                <button
                  onClick={() => {
                    // This would need to be implemented in the contract
                    alert('Authorization feature not implemented yet');
                  }}
                  className="bg-blue-600 text-white py-2 px-4 rounded-r hover:bg-blue-700 transition duration-200"
                >
                  Add User
                </button>
              </div>
              {authorizedUsers.length === 0 ? (
                <p className="text-gray-400">No authorized users added yet.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto bg-gray-700 rounded-lg">
                  {authorizedUsers.map((user, index) => (
                    <div key={index} className="flex justify-between items-center border-b border-gray-600 py-2 px-3">
                      <span className="text-sm text-gray-300 truncate">{user}</span>
                      <button
                        onClick={() => {
                          // This would need to be implemented in the contract
                          alert('Revocation feature not implemented yet');
                        }}
                        className="bg-red-600 text-white py-1 px-2 rounded text-xs hover:bg-red-700 transition duration-200"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Facility;
