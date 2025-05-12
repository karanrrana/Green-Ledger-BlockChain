import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Web3 from 'web3';
import ABI from "../ABI.json";
import { WALLET_CONFIG, isCorrectWallet } from "../walletConfig";
import { WASTE_MANAGEMENT_ADDRESS } from "../config";

function Disposal() {
  // State for form inputs
  const [transportWasteId, setTransportWasteId] = useState("");
  const [isLandfills, setIsLandfills] = useState(false);
  const [isAshPits, setIsAshPits] = useState(false);
  const [isSewerLines, setIsSewerLines] = useState(false);
  const [isRecycling, setIsRecycling] = useState(false);
  const [isSegregationProper, setIsSegregationProper] = useState(false);
  const [isThermal, setIsThermal] = useState(false);
  const [isChemical, setIsChemical] = useState(false);
  const [isBiological, setIsBiological] = useState(false);
  const [isMechanical, setIsMechanical] = useState(false);
  const [isOtherTreated, setIsOtherTreated] = useState(false);

  // Other state variables
  const [address, setAddress] = useState("");
  const [isWalletCorrect, setIsWalletCorrect] = useState(false);
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);

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
          console.log("Connected Address:", currentAddress);

          // Check if the connected wallet is the correct one for disposal
          const correctWallet = isCorrectWallet(currentAddress, 'DISPOSAL');
          setIsWalletCorrect(correctWallet);

          if (!correctWallet) {
            alert(`Please connect with the Disposal wallet: ${WALLET_CONFIG.DISPOSAL}`);
          }

          // Listen for account changes
          window.ethereum.on('accountsChanged', (newAccounts) => {
            const newAddress = newAccounts[0];
            setAddress(newAddress);
            console.log("Account changed:", newAddress);

            const newCorrectWallet = isCorrectWallet(newAddress, 'DISPOSAL');
            setIsWalletCorrect(newCorrectWallet);

            if (!newCorrectWallet) {
              alert(`Please connect with the Disposal wallet: ${WALLET_CONFIG.DISPOSAL}`);
            }
          });
        } catch (error) {
          console.error("MetaMask Connection Error:", error);
        }
      } else {
        console.error("MetaMask not detected");
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

  const web3 = new Web3(window.ethereum);
  const contractAddress = WASTE_MANAGEMENT_ADDRESS;
  const contract = new web3.eth.Contract(ABI, contractAddress);

  // Fetch facilities when address changes
  useEffect(() => {
    if (address) {
      fetchFacilities().catch(error => {
        console.error("Error in fetchFacilities:", error);
        alert('Error: Unable to fetch facilities. Please check console for details.');
      });
    }
  }, [address]);

  // Function to fetch facilities for the current address
  const fetchFacilities = async () => {
    if (!address) return;

    try {
      console.log("Fetching facilities for address:", address);
      
      // First check if we have cached facilities
      const cachedFacilities = JSON.parse(localStorage.getItem('disposalFacilities') || '[]');
      const lastUpdate = localStorage.getItem('lastDisposalFacilityUpdate');
      const now = Date.now();
      
      // If we have recently cached facilities (less than 5 minutes old), use them
      if (cachedFacilities.length > 0 && lastUpdate && (now - parseInt(lastUpdate)) < 300000) {
        console.log("Using cached disposal facilities");
        setFacilities(cachedFacilities);
        
        if (cachedFacilities.length > 0) {
          setSelectedFacility(cachedFacilities[0].facilityId);
        }
        
        return;
      }
      
      // Get all facilities for this address
      const allFacilities = await contract.methods.getFacilities().call({ from: address });
      console.log("Raw facilities data:", allFacilities);
      
      if (!allFacilities || allFacilities.length === 0) {
        console.log("No facilities found for this address");
        setFacilities([]);
        return;
      }
      
      // Format the facilities data and filter for disposal capability
      const formattedFacilities = await Promise.all(allFacilities.map(async (facility) => {
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
          facilityType: getFacilityTypeString(Number(facility.facilityType)),
          owner: facility.owner,
          capabilities
        };
      }));
      
      // Filter for facilities with disposal capability
      const disposalFacilities = formattedFacilities.filter(
        facility => facility.capabilities.canDisposeWaste
      );
      
      console.log("Disposal facilities:", disposalFacilities);
      
      // Save to localStorage
      localStorage.setItem('disposalFacilities', JSON.stringify(disposalFacilities));
      localStorage.setItem('lastDisposalFacilityUpdate', Date.now().toString());
      
      setFacilities(disposalFacilities);
      
      // If we have facilities, select the first one
      if (disposalFacilities.length > 0) {
        setSelectedFacility(disposalFacilities[0].facilityId);
      }
    } catch (error) {
      console.error("Error fetching facilities:", error);
      
      // Try fallback method
      try {
        console.log("Attempting fallback method to fetch facilities...");
        const facilityCount = await contract.methods.getFacilityCount().call();
        const fetchedFacilities = [];
        
        for (let i = 0; i < facilityCount; i++) {
          try {
            const facilityId = await contract.methods.facilityIds(i).call();
            const facility = await contract.methods.getFacility(facilityId).call();
            
            // Check if the facility belongs to the current user
            if (facility.owner.toLowerCase() === address.toLowerCase()) {
              // Check if it has disposal capability
              let hasDisposalCapability = false;
              try {
                const capabilities = await contract.methods.facilityCapabilities(facilityId).call();
                hasDisposalCapability = capabilities.canDisposeWaste;
              } catch (capError) {
                console.warn(`Could not check capabilities for facility ${facilityId}:`, capError);
              }
              
              if (hasDisposalCapability) {
                fetchedFacilities.push({
                  facilityId: facilityId.toString(),
                  facilityName: facility.facilityName,
                  facilityType: getFacilityTypeString(Number(facility.facilityType)),
                  owner: facility.owner
                });
              }
            }
          } catch (facilityError) {
            console.warn(`Error fetching facility at index ${i}:`, facilityError);
          }
        }
        
        console.log("Fallback method facilities:", fetchedFacilities);
        
        // Save to localStorage
        localStorage.setItem('disposalFacilities', JSON.stringify(fetchedFacilities));
        localStorage.setItem('lastDisposalFacilityUpdate', Date.now().toString());
        
        setFacilities(fetchedFacilities);
        
        if (fetchedFacilities.length > 0) {
          setSelectedFacility(fetchedFacilities[0].facilityId);
        }
      } catch (fallbackError) {
        console.error("Fallback method also failed:", fallbackError);
        alert('Error: Unable to fetch facilities');
      }
    }
  };

  // Add a helper function to get facility type string
  const getFacilityTypeString = (facilityType) => {
    switch (facilityType) {
      case 0: return "Hospital";
      case 1: return "Treatment";
      case 2: return "Disposal";
      case 3: return "Transport";
      default: return "Unknown";
    }
  };

  const disposalWasteRegistration = async () => {
    try {
      // Check if the correct wallet is connected
      if (!isWalletCorrect) {
        alert(`Please connect with the Disposal wallet: ${WALLET_CONFIG.DISPOSAL}`);
        return;
      }

      // Check if a facility is selected
      if (!selectedFacility) {
        alert('Please select a facility first');
        return;
      }

      // Validate transport waste ID
      if (!transportWasteId) {
        alert('Please enter a valid Transport Waste ID to link');
        return;
      }

      const transportWasteIdValue = parseInt(transportWasteId);
      if (isNaN(transportWasteIdValue) || transportWasteIdValue <= 0) {
        alert('Transport Waste ID must be a positive number');
        return;
      }

      // First, check if the transport waste exists
      try {
        const transportWaste = await contract.methods.getTransportWasteById(transportWasteIdValue).call({ from: address });
        console.log("Transport waste found:", transportWaste);
        
        // Check if the transport waste has a vehicle number (as required by the contract)
        if (!transportWaste.vehicleNumber || transportWaste.vehicleNumber.length === 0) {
          alert('The specified Transport Waste ID does not have a valid vehicle number');
          return;
        }
      } catch (error) {
        console.error("Error checking transport waste:", error);
        alert('Error: The specified Transport Waste ID does not exist');
        return;
      }

      // Calculate disposal info (bitwise combination of disposal methods)
      const disposalInfo = (isLandfills ? 1 : 0) | 
                           (isAshPits ? 2 : 0) | 
                           (isSewerLines ? 4 : 0) | 
                           (isRecycling ? 8 : 0);

      // Calculate treatment info (bitwise combination of treatment methods)
      const treatmentInfo = (isThermal ? 1 : 0) | 
                            (isChemical ? 2 : 0) | 
                            (isBiological ? 4 : 0) | 
                            (isMechanical ? 8 : 0);

      console.log("Sending transaction with params:", {
        disposalInfo,
        isSegregationProper,
        treatmentInfo,
        isOtherTreated,
        transportWasteId: transportWasteIdValue,
        facilityId: selectedFacility
      });

      const result = await contract.methods
        .registerDisposalWaste(
          disposalInfo,
          isSegregationProper,
          treatmentInfo,
          isOtherTreated,
          transportWasteIdValue,
          selectedFacility // Pass the selected facility ID
        )
        .send({ from: address, gas: 3000000 });

      console.log("Transaction Result:", result);
      
      // Improved event handling
      let wasteId;
      if (result.events && result.events.DisposalWasteRegistered) {
        wasteId = result.events.DisposalWasteRegistered.returnValues.wasteId;
        alert('Disposal Waste registered successfully with ID: ' + wasteId);
      } else {
        console.log("DisposalWasteRegistered event not found in transaction result");
        alert('Disposal Waste registered successfully, but could not retrieve the waste ID. Check the transaction logs for details.');
      }
      
      // Clear form after successful submission
      setTransportWasteId("");
    } catch (error) {
      console.error("Transaction Error:", error);
      alert('Disposal Waste registration failed: ' + error.message);
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex flex-row mt-8 mx-4 mr-6 p-6 gap-10-px">
        {/* Wallet Status */}
        <div className={`mb-4 p-4 rounded-lg ${isWalletCorrect ? 'bg-green-50' : 'bg-red-50'} w-full max-w-md mx-auto`}>
          <h2 className="text-xl font-bold mb-2">Wallet Status</h2>
          <div className="space-y-2">
            <p><strong>Connected Address:</strong> {address}</p>
            <p><strong>Required Wallet:</strong> {WALLET_CONFIG.DISPOSAL}</p>
            <p><strong>Status:</strong>
              {isWalletCorrect
                ? <span className="text-green-600 font-bold">✓ Correct wallet connected</span>
                : <span className="text-red-600 font-bold">✗ Incorrect wallet connected</span>}
            </p>
            <button 
              onClick={() => fetchFacilities()} 
              className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Refresh Facilities
            </button>
          </div>
        </div>

        <div className="card w-96 bg-base-100 shadow-xl mb-4">
          <div className="card-body">
            <div className="text-xl font-bold text-center my-4">Select Facility</div>
            {facilities.length === 0 ? (
              <div className="text-center text-gray-500">
                <p>No disposal facilities found.</p>
                <p className="text-sm mt-2">Please register a facility with disposal capability first.</p>
              </div>
            ) : (
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="facilitySelect">
                  Disposal Facility
                </label>
                <select
                  id="facilitySelect"
                  value={selectedFacility || ''}
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  className="select select-bordered w-full max-w-xs"
                >
                  <option value="" disabled>Select a facility</option>
                  {facilities.map((facility) => (
                    <option key={facility.facilityId} value={facility.facilityId}>
                      {facility.facilityName} ({facility.facilityType})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Treatment Information Card */}
          <div className="card w-96 bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="text-xl font-bold text-center my-10">Treatment Information</div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="thermal">Thermal-Incinerators and Autoclaves</label>
                <select
                  id="thermal"
                  value={isThermal}
                  onChange={(e) => setIsThermal(e.target.value === "true")}
                  className="select select-bordered w-full max-w-xs"
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="chemical">Chemical-Chemical disinfection</label>
                <select
                  id="chemical"
                  value={isChemical}
                  onChange={(e) => setIsChemical(e.target.value === "true")}
                  className="select select-bordered w-full max-w-xs"
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="biological">Biological-Decomposition and Biodigestion</label>
                <select
                  id="biological"
                  value={isBiological}
                  onChange={(e) => setIsBiological(e.target.value === "true")}
                  className="select select-bordered w-full max-w-xs"
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="mechanical">Mechanical-Shredding Grinding</label>
                <select
                  id="mechanical"
                  value={isMechanical}
                  onChange={(e) => setIsMechanical(e.target.value === "true")}
                  className="select select-bordered w-full max-w-xs"
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="mechanical">Are Other Treatment Methods used</label>
                <select
                  id="Other"
                  value={isOtherTreated}
                  onChange={(e) => setIsOtherTreated(e.target.value === "true")}
                  className="select select-bordered w-full max-w-xs"
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
            </div>
          </div>
          {/* Disposal Information Card */}
          <div className="card w-96 bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="text-xl font-bold text-center my-10">Disposal Information</div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="landfills">Landfills</label>
                <select
                  id="landfills"
                  value={isLandfills}
                  onChange={(e) => setIsLandfills(e.target.value === "true")}
                  className="select select-bordered w-full max-w-xs"
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="ashPits">Ash Pits</label>
                <select
                  id="ashPits"
                  value={isAshPits}
                  onChange={(e) => setIsAshPits(e.target.value === "true")}
                  className="select select-bordered w-full max-w-xs"
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sewerLines">Sewer Lines- Liquid Waste</label>
                <select
                  id="sewerLines"
                  value={isSewerLines}
                  onChange={(e) => setIsSewerLines(e.target.value === "true")}
                  className="select select-bordered w-full max-w-xs"
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="recycling">Recycling</label>
                <select
                  id="recycling"
                  value={isRecycling}
                  onChange={(e) => setIsRecycling(e.target.value === "true")}
                  className="select select-bordered w-full max-w-xs"
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
              <br />
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="isSegregationProper">Segregation was properly done?</label>
              <select
                id="isSegregationProper"
                value={isSegregationProper}
                onChange={(e) => setIsSegregationProper(e.target.value === "true")}
                className="select select-bordered w-full max-w-xs"
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="transportWasteId">
                  Transport Waste ID (to link)
                </label>
                <input
                  type="number"
                  id="transportWasteId"
                  value={transportWasteId}
                  onChange={(e) => setTransportWasteId(e.target.value)}
                  className="border rounded-md px-4 py-2 w-full"
                  placeholder="Enter Transport Waste ID"
                  required
                />
              </div>
              <button onClick={disposalWasteRegistration} className="btn btn-primary mt-4">Add</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Disposal;
