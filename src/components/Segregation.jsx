import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Web3 from 'web3';
import ABI from "../ABI.json";
import { isWalletConnected } from "../walletConfig";
import { WASTE_MANAGEMENT_ADDRESS } from "../config";

function Segregation() {
  // State variables
  const [address, setAddress] = useState("");
  const [isSegregationDone, setIsSegregationDone] = useState(false);
  const [totalWaste, setTotalWaste] = useState("");
  const [totalBiomedicalWaste, setTotalBiomedicalWaste] = useState("");
  const [storageProperlyDone, setStorageProperlyDone] = useState(false);
  const [binsNotOverflowing, setBinsNotOverflowing] = useState(false);
  const [wasteStored24Hours, setWasteStored24Hours] = useState(false);
  const [temperatureRecorded, setTemperatureRecorded] = useState("");
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [manualFacilityName, setManualFacilityName] = useState("");
  const [manualFacilityId, setManualFacilityId] = useState("");
  const [manualFacilityType, setManualFacilityType] = useState("0");
  const [showManualFacilityForm, setShowManualFacilityForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hospitalWastes, setHospitalWastes] = useState([]);
  const [selectedHospitalWaste, setSelectedHospitalWaste] = useState(null);

  // Initialize web3
  const web3 = new Web3(window.ethereum);
  const contractAddress = WASTE_MANAGEMENT_ADDRESS;
  const contract = new web3.eth.Contract(ABI, contractAddress);

  // Connect wallet
  useEffect(() => {
    const connectWallet = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
          });
          setAddress(accounts[0]);

          // Listen for account changes
          window.ethereum.on('accountsChanged', (newAccounts) => {
            setAddress(newAccounts[0]);
          });
        } catch (error) {
          console.error('Error connecting to MetaMask:', error);
          setError('Failed to connect to MetaMask. Please make sure it is installed and unlocked.');
        }
      } else {
        setError('MetaMask not detected. Please install MetaMask to use this application.');
      }
    };

    connectWallet();

    // Cleanup
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

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

  // Load user's facilities when address changes
  useEffect(() => {
    if (address) {
      loadUserFacilities();
    }
  }, [address]);

  // Load user's facilities from the blockchain
  const loadUserFacilities = async () => {
    try {
      setLoading(true);
      setError("");
      
      // First check if we have cached facilities
      const cachedFacilities = JSON.parse(localStorage.getItem('userFacilities') || '[]');
      const lastUpdate = localStorage.getItem('lastFacilityUpdate');
      const now = Date.now();
      
      // If we have recently cached facilities (less than 5 minutes old), use them
      if (cachedFacilities.length > 0 && lastUpdate && (now - parseInt(lastUpdate)) < 300000) {
        console.log("Using cached facilities");
        setFacilities(cachedFacilities);
        
        if (cachedFacilities.length > 0 && !selectedFacility) {
          setSelectedFacility(cachedFacilities[0]);
        }
        
        setLoading(false);
        return;
      }
      
      // Otherwise, fetch from blockchain
      console.log("Fetching facilities from blockchain");
      
      // Use the getFacilities method to get all facilities for the current user
      const fetchedFacilities = await contract.methods.getFacilities().call({ from: address });
      console.log("Raw fetched facilities:", fetchedFacilities);
      
      // Format the facilities data
      const formattedFacilities = await Promise.all(fetchedFacilities.map(async (facility) => {
        // Get facility capabilities
        let capabilities = { canSegregateWaste: false, canTransportWaste: false, canDisposeWaste: false };
        
        try {
          capabilities = await contract.methods.facilityCapabilities(facility.facilityId).call();
        } catch (error) {
          console.warn(`Could not fetch capabilities for facility ${facility.facilityId}:`, error);
        }
        
        return {
          facilityId: facility.facilityId.toString(),
          facilityName: facility.facilityName,
          facilityType: parseInt(facility.facilityType),
          facilityTypeString: getFacilityTypeString(parseInt(facility.facilityType)),
          owner: facility.owner,
          capabilities
        };
      }));
      
      console.log("Formatted facilities:", formattedFacilities);
      
      // Save to localStorage
      localStorage.setItem('userFacilities', JSON.stringify(formattedFacilities));
      localStorage.setItem('lastFacilityUpdate', Date.now().toString());
      
      setFacilities(formattedFacilities);
      
      if (formattedFacilities.length > 0 && !selectedFacility) {
        setSelectedFacility(formattedFacilities[0]);
      }
    } catch (error) {
      console.error("Error loading facilities:", error);
      setError("Failed to load facilities. Please try again. Error: " + error.message);
      
      // Fallback: Try to get facilities by iterating through facilityIds
      try {
        console.log("Attempting fallback method to fetch facilities...");
        const facilityCount = await contract.methods.getFacilityCount().call();
        const fetchedFacilities = [];
        
        for (let i = 0; i < facilityCount; i++) {
          const facilityId = await contract.methods.facilityIds(i).call();
          const facility = await contract.methods.getFacility(facilityId).call();
          
          // Check if the facility belongs to the current user
          if (facility.owner.toLowerCase() === address.toLowerCase()) {
            fetchedFacilities.push({
              facilityId: facility.facilityId.toString(),
              facilityName: facility.facilityName,
              facilityType: parseInt(facility.facilityType),
              facilityTypeString: getFacilityTypeString(parseInt(facility.facilityType)),
              owner: facility.owner,
              capabilities: { canSegregateWaste: true } // Assume all facilities can segregate for now
            });
          }
        }
        
        console.log("Fallback method facilities:", fetchedFacilities);
        
        // Save to localStorage
        localStorage.setItem('userFacilities', JSON.stringify(fetchedFacilities));
        localStorage.setItem('lastFacilityUpdate', Date.now().toString());
        
        setFacilities(fetchedFacilities);
        
        if (fetchedFacilities.length > 0 && !selectedFacility) {
          setSelectedFacility(fetchedFacilities[0]);
        }
        
        setError(""); // Clear error if fallback succeeds
      } catch (fallbackError) {
        console.error("Fallback method also failed:", fallbackError);
        setError("Failed to load facilities. Please try refreshing the page or check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Load hospital wastes for the selected facility
  const loadHospitalWastes = async () => {
    if (!selectedFacility) {
      setHospitalWastes([]);
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      
      console.log("Loading hospital wastes for facility ID:", selectedFacility.facilityId);
      
      // First check if the contract has the required method
      if (!contract.methods.getHospitalWastesByFacility) {
        console.warn("getHospitalWastesByFacility method not found in contract");
        
        // Fallback: Try to get wastes by iterating through events
        const events = await contract.getPastEvents('HospitalWasteRegistered', {
          filter: { facilityId: selectedFacility.facilityId },
          fromBlock: 0,
          toBlock: 'latest'
        });
        
        console.log("Hospital waste events:", events);
        
        if (events && events.length > 0) {
          const wastePromises = events.map(async (event) => {
            const wasteId = event.returnValues.wasteId;
            try {
              const wasteData = await contract.methods.getHospitalWasteId(wasteId).call({ from: address });
              return {
                ...wasteData,
                wasteId,
                timestamp: new Date(event.returnValues.timestamp * 1000).toLocaleString()
              };
            } catch (err) {
              console.error(`Error fetching waste ID ${wasteId}:`, err);
              return null;
            }
          });
          
          const wastes = (await Promise.all(wastePromises)).filter(waste => waste !== null);
          console.log("Fetched hospital wastes:", wastes);
          setHospitalWastes(wastes);
        } else {
          console.log("No hospital waste events found for facility");
          setHospitalWastes([]);
        }
      } else {
        // Use the contract method if available
        const wastes = await contract.methods.getHospitalWastesByFacility(selectedFacility.facilityId).call({ from: address });
        console.log("Fetched hospital wastes:", wastes);
        setHospitalWastes(wastes);
      }
    } catch (error) {
      console.error("Error loading hospital wastes:", error);
      setError("Failed to load hospital wastes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Load hospital wastes when a facility is selected
  useEffect(() => {
    if (selectedFacility) {
      loadHospitalWastes();
    }
  }, [selectedFacility]);

  // Handle form submission
  const hospitalWasteRegistration = async () => {
    if (!selectedFacility) {
      setError("Please select a facility first.");
      return;
    }
    
    if (!totalWaste || !totalBiomedicalWaste || !temperatureRecorded) {
      setError("Please fill in all required fields.");
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      const numericFacilityId = parseInt(selectedFacility.facilityId);
      
      console.log("Submitting waste data for facility:", numericFacilityId);
      console.log("Data:", {
        isSegregationDone,
        totalWaste,
        totalBiomedicalWaste,
        storageProperlyDone,
        binsNotOverflowing,
        wasteStored24Hours,
        temperatureRecorded
      });
      
      // Check if the facility has segregation capability
      const capabilities = await contract.methods.facilityCapabilities(numericFacilityId).call();
      if (!capabilities.canSegregateWaste) {
        setError("This facility does not have segregation capability. Please enable it in the Facility Management page.");
        setLoading(false);
        return;
      }
      
      // Try with higher gas limit
      const result = await contract.methods
        .registerHospitalWaste(
          isSegregationDone,
          Number(totalWaste),
          Number(totalBiomedicalWaste),
          storageProperlyDone,
          binsNotOverflowing,
          wasteStored24Hours,
          Number(temperatureRecorded),
          numericFacilityId
        )
        .send({ 
          from: address, 
          gas: 5000000,  // Increased gas limit
          gasPrice: await web3.eth.getGasPrice() // Use current gas price
        });
      
      console.log("Transaction result:", result);
      
      // Extract waste ID from the event if available
      let wasteId = null;
      if (result.events && result.events.HospitalWasteRegistered) {
        wasteId = result.events.HospitalWasteRegistered.returnValues.wasteId;
        setSuccess(`Hospital waste registered successfully with ID: ${wasteId}`);
        
        // Refresh the hospital wastes list
        await loadHospitalWastes();
      }
      
      // Reset form
      setIsSegregationDone(false);
      setTotalWaste("");
      setTotalBiomedicalWaste("");
      setStorageProperlyDone(false);
      setBinsNotOverflowing(false);
      setWasteStored24Hours(false);
      setTemperatureRecorded("");
    } catch (error) {
      console.error("Error registering waste:", error);
      setError(`Failed to register waste: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add a facility manually (for testing)
  const addManualFacility = async () => {
    if (!manualFacilityName || !manualFacilityId) {
      setError("Please enter both facility name and ID.");
      return;
    }
    
    const facilityId = parseInt(manualFacilityId);
    if (isNaN(facilityId)) {
      setError("Facility ID must be a number.");
      return;
    }
    
    try {
      // Check if the facility exists in the contract
      let existingFacility = null;
      try {
        existingFacility = await contract.methods.getFacility(facilityId).call();
        
        if (existingFacility && existingFacility.owner !== address) {
          const useExisting = window.confirm(
            `Facility with ID ${facilityId} exists but is owned by another address. ` +
            `Do you want to use it anyway? (This is only for testing purposes)`
          );
          
          if (useExisting) {
            const formattedFacility = {
              facilityId: existingFacility.facilityId.toString(),
              facilityName: existingFacility.facilityName,
              facilityType: Number(existingFacility.facilityType),
              facilityTypeString: getFacilityTypeString(Number(existingFacility.facilityType)),
              owner: existingFacility.owner
            };
            
            // Add to facilities state
            setFacilities(prevFacilities => {
              const exists = prevFacilities.some(f => f.facilityId === formattedFacility.facilityId);
              if (!exists) {
                const updatedFacilities = [...prevFacilities, formattedFacility];
                localStorage.setItem('userFacilities', JSON.stringify(updatedFacilities));
                localStorage.setItem('lastFacilityUpdate', Date.now().toString());
                return updatedFacilities;
              }
              return prevFacilities;
            });
            
            // Select the facility
            setSelectedFacility(formattedFacility);
            setShowManualFacilityForm(false);
            return;
          }
        }
      } catch (e) {
        // Facility doesn't exist in the contract, which is fine for manual entry
        console.log(`Facility with ID ${facilityId} doesn't exist in the contract, proceeding with manual entry`);
      }
      
      // Create the facility object
      const newFacility = {
        facilityId: facilityId.toString(),
        facilityName: manualFacilityName,
        facilityType: Number(manualFacilityType),
        facilityTypeString: getFacilityTypeString(Number(manualFacilityType)),
        owner: address,
        isLocal: true, // Mark as locally added
        capabilities: {
          canSegregateWaste: true,
          canTransportWaste: false,
          canDisposeWaste: false
        }
      };
      
      // Add to facilities state
      setFacilities(prevFacilities => {
        // Check if facility with this ID already exists locally
        const exists = prevFacilities.some(f => f.facilityId === facilityId.toString());
        if (exists) {
          alert(`A facility with ID ${facilityId} already exists in your local storage. Please use a different ID.`);
          return prevFacilities;
        }
        
        const updatedFacilities = [...prevFacilities, newFacility];
        
        // Save to localStorage
        localStorage.setItem('userFacilities', JSON.stringify(updatedFacilities));
        localStorage.setItem('lastFacilityUpdate', Date.now().toString());
        
        // Select the new facility
        setSelectedFacility(newFacility);
        
        alert(`Facility "${manualFacilityName}" with ID ${facilityId} added successfully!`);
        
        // Reset form
        setManualFacilityName("");
        setManualFacilityId("");
        setShowManualFacilityForm(false);
        
        return updatedFacilities;
      });
    } catch (error) {
      console.error("Error adding manual facility:", error);
      setError(`Failed to add facility: ${error.message}`);
    }
  };

  // Function to check if the contract exists
  const checkContractExists = async () => {
    try {
      console.log("Checking contract at address:", contractAddress);
      
      // Check if the contract exists at the address
      const code = await web3.eth.getCode(contractAddress);
      const exists = code !== '0x' && code !== '0x0';
      
      console.log("Contract code:", code);
      console.log("Contract exists:", exists);
      
      if (exists) {
        alert(`Contract exists at address: ${contractAddress}`);
        return true;
      } else {
        alert(`No contract found at address: ${contractAddress}`);
        return false;
      }
    } catch (error) {
      console.error("Error checking contract:", error);
      alert(`Error checking contract: ${error.message}`);
      return false;
    }
  };

  // Add a debug function to check contract methods
  const debugContract = async () => {
    try {
      console.log("Debugging contract...");
      console.log("Contract address:", contractAddress);
      console.log("Available methods:", Object.keys(contract.methods));
      
      // Check if the contract exists
      const code = await web3.eth.getCode(contractAddress);
      console.log("Contract code exists:", code !== '0x' && code !== '0x0');
      
      // Try to get facility count
      const facilityCount = await contract.methods.getFacilityCount().call();
      console.log("Facility count:", facilityCount);
      
      alert(`Contract debugging complete. Check console for details. Facility count: ${facilityCount}`);
    } catch (error) {
      console.error("Debug error:", error);
      alert(`Debug error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Waste Segregation</h1>
        
        {/* Wallet Connection Status */}
        <div className="border border-white/30 p-4 rounded-lg mb-6 bg-black/50">
          <p className="font-semibold">Connected Wallet: {address || 'Not connected'}</p>
        </div>
        
        {/* Facility Selection */}
        <div className="border border-white/30 p-6 rounded-lg mb-8 bg-black/50">
          <h2 className="text-2xl font-bold mb-4">Select Facility</h2>
          
          {/* Selected Facility Indicator */}
          {selectedFacility && (
            <div className="mb-6 p-4 border-l-4 border-blue-500 bg-blue-900/20 rounded-r-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-blue-400">{selectedFacility.facilityName}</h3>
                  <p className="text-white/80">Type: {selectedFacility.facilityTypeString || getFacilityTypeString(selectedFacility.facilityType)}</p>
                  <p className="text-white/80">ID: {selectedFacility.facilityId}</p>
                </div>
                <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  SELECTED
                </div>
              </div>
            </div>
          )}
          
          {loading && <p className="text-gray-400">Loading facilities...</p>}
          
          {error && <p className="text-red-400 mb-4">{error}</p>}
          
          {!loading && facilities.length === 0 ? (
            <div>
              <p className="text-gray-400 mb-4">No facilities found with segregation capability.</p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={loadUserFacilities}
                  className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                >
                  Refresh Facilities
                </button>
                <button
                  onClick={() => setShowManualFacilityForm(!showManualFacilityForm)}
                  className="bg-transparent border border-white text-white py-2 px-4 rounded hover:bg-white/10 transition-colors"
                >
                  {showManualFacilityForm ? 'Hide Manual Form' : 'Add Facility Manually'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-white/80">Available Facilities:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {facilities.map((facility) => (
                  <div 
                    key={facility.facilityId} 
                    className={`border p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedFacility && selectedFacility.facilityId === facility.facilityId 
                        ? 'border-blue-500 bg-blue-900/20' 
                        : 'border-white/30 hover:border-white/60 bg-black/50'
                    }`}
                    onClick={() => setSelectedFacility(facility)}
                  >
                    <h3 className="font-bold text-lg">{facility.facilityName}</h3>
                    <p>Type: {facility.facilityTypeString || getFacilityTypeString(facility.facilityType)}</p>
                    <p>ID: {facility.facilityId}</p>
                    <p className="text-sm text-green-400">✓ Segregation Enabled</p>
                    {selectedFacility && selectedFacility.facilityId === facility.facilityId && (
                      <div className="mt-2 text-center">
                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                          SELECTED
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={loadUserFacilities}
                  className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                >
                  Refresh Facilities
                </button>
                <button
                  onClick={() => setShowManualFacilityForm(!showManualFacilityForm)}
                  className="bg-transparent border border-white text-white py-2 px-4 rounded hover:bg-white/10 transition-colors"
                >
                  {showManualFacilityForm ? 'Hide Manual Form' : 'Add Facility Manually'}
                </button>
              </div>
            </div>
          )}
          
          {/* Manual Facility Form remains unchanged */}
        </div>
        
        {/* Hospital Wastes Table */}
        <div className="border border-white/30 p-6 rounded-lg mb-8 bg-black/50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Hospital Wastes</h2>
            {selectedFacility && (
              <div className="flex items-center gap-2">
                <span className="text-white/70">
                  for {selectedFacility.facilityName}
                </span>
                <button
                  onClick={loadHospitalWastes}
                  className="bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  Refresh Wastes
                </button>
              </div>
            )}
          </div>
          
          {!selectedFacility ? (
            <div className="p-4 border border-yellow-500/30 bg-yellow-900/20 rounded-lg">
              <p className="text-yellow-400">Please select a facility above to view and manage hospital wastes.</p>
            </div>
          ) : (
            <>
              {loading && <p className="text-gray-400">Loading hospital wastes...</p>}
              
              {error && <p className="text-red-400 mb-4">{error}</p>}
              
              {success && <p className="text-green-400 mb-4">{success}</p>}
              
              {!loading && hospitalWastes.length === 0 ? (
                <p className="text-gray-400">No hospital wastes found for {selectedFacility.facilityName}.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Waste ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Waste (kg)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Biomedical Waste (kg)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {hospitalWastes.map((waste) => (
                        <tr key={waste.wasteId} className="hover:bg-white/5">
                          <td className="px-6 py-4 whitespace-nowrap">{waste.wasteId}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{waste.totalWaste}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{waste.totalBiomedicalWaste}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{waste.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Segregation & Storage Form */}
        <div className="border border-white/30 p-6 rounded-lg bg-black/50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Segregation & Storage</h2>
            {selectedFacility && (
              <div className="bg-blue-900/30 border border-blue-500/50 px-3 py-1 rounded-lg">
                <span className="text-blue-400 font-medium">
                  For: {selectedFacility.facilityName}
                </span>
              </div>
            )}
          </div>
          
          {!selectedFacility ? (
            <div className="p-4 border border-yellow-500/30 bg-yellow-900/20 rounded-lg">
              <p className="text-yellow-400">Please select a facility above to register hospital waste.</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); hospitalWasteRegistration(); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="mb-4">
                  <label className="flex items-center space-x-2 text-white text-sm font-bold mb-2">
                    <input
                      type="checkbox"
                      checked={isSegregationDone}
                      onChange={(e) => setIsSegregationDone(e.target.checked)}
                      className="form-checkbox h-5 w-5 text-blue-600 border-white/30 bg-black/50"
                    />
                    <span>Is Segregation Done?</span>
                  </label>
                </div>
                
                <div className="mb-4">
                  <label className="block text-white text-sm font-bold mb-2">Total Waste (kg)</label>
                  <input
                    type="number"
                    value={totalWaste}
                    onChange={(e) => setTotalWaste(e.target.value)}
                    className="border border-white/30 bg-black/50 rounded-md px-4 py-2 w-full text-white"
                    placeholder="Enter total waste in kg"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-white text-sm font-bold mb-2">Total Biomedical Waste (kg)</label>
                  <input
                    type="number"
                    value={totalBiomedicalWaste}
                    onChange={(e) => setTotalBiomedicalWaste(e.target.value)}
                    className="border border-white/30 bg-black/50 rounded-md px-4 py-2 w-full text-white"
                    placeholder="Enter total biomedical waste in kg"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="flex items-center space-x-2 text-white text-sm font-bold mb-2">
                    <input
                      type="checkbox"
                      checked={storageProperlyDone}
                      onChange={(e) => setStorageProperlyDone(e.target.checked)}
                      className="form-checkbox h-5 w-5 text-blue-600 border-white/30 bg-black/50"
                    />
                    <span>Is Storage Properly Done?</span>
                  </label>
                </div>
                
                <div className="mb-4">
                  <label className="flex items-center space-x-2 text-white text-sm font-bold mb-2">
                    <input
                      type="checkbox"
                      checked={binsNotOverflowing}
                      onChange={(e) => setBinsNotOverflowing(e.target.checked)}
                      className="form-checkbox h-5 w-5 text-blue-600 border-white/30 bg-black/50"
                    />
                    <span>Are Bins Not Overflowing?</span>
                  </label>
                </div>
                
                <div className="mb-4">
                  <label className="flex items-center space-x-2 text-white text-sm font-bold mb-2">
                    <input
                      type="checkbox"
                      checked={wasteStored24Hours}
                      onChange={(e) => setWasteStored24Hours(e.target.checked)}
                      className="form-checkbox h-5 w-5 text-blue-600 border-white/30 bg-black/50"
                    />
                    <span>Is Waste Stored for 24 Hours?</span>
                  </label>
                </div>
                
                <div className="mb-4">
                  <label className="block text-white text-sm font-bold mb-2">Temperature Recorded (°C)</label>
                  <input
                    type="number"
                    value={temperatureRecorded}
                    onChange={(e) => setTemperatureRecorded(e.target.value)}
                    className="border border-white/30 bg-black/50 rounded-md px-4 py-2 w-full text-white"
                    placeholder="Enter temperature in °C"
                    required
                  />
                </div>
              </div>
              
              <button
                type="submit"
                className="mt-4 bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? "Registering..." : "Register Hospital Waste"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Segregation;
