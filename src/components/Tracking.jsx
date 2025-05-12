import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Web3 from 'web3';
import ABI from "../ABI.json";
import { WALLET_CONFIG, isCorrectWallet } from "../walletConfig";
import { WASTE_MANAGEMENT_ADDRESS } from "../config";

function Tracking() {
  const [shipments, setShipments] = useState([]);
  const [address, setAddress] = useState("");
  const [isWalletCorrect, setIsWalletCorrect] = useState(false);
  const [newShipment, setNewShipment] = useState({
    id: '',
    No: '', // Changed from vehicleNo
    status: '',
    estimatedArrival: '',
    waste: '', // Added waste field
    hospitalWasteId: '' // Added to link with hospital waste
  });
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [transportWastes, setTransportWastes] = useState([]);
  const [loadingWastes, setLoadingWastes] = useState(false);
  const [wasteError, setWasteError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewShipment({ ...newShipment, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShipments([...shipments, newShipment]);
    setNewShipment({ id: '', No: '', status: '', estimatedArrival: '', waste: '', hospitalWasteId: '' });
  };

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

          // Check if the connected wallet is the correct one for tracking
          const correctWallet = isCorrectWallet(currentAddress, 'TRANSPORT');
          setIsWalletCorrect(correctWallet);

          if (!correctWallet) {
            alert(`Please connect with the Transport wallet: ${WALLET_CONFIG.TRANSPORT}`);
          }

          // Listen for account changes
          window.ethereum.on('accountsChanged', (newAccounts) => {
            const newAddress = newAccounts[0];
            setAddress(newAddress);
            const newCorrectWallet = isCorrectWallet(newAddress, 'TRANSPORT');
            setIsWalletCorrect(newCorrectWallet);

            if (!newCorrectWallet) {
              alert(`Please connect with the Transport wallet: ${WALLET_CONFIG.TRANSPORT}`);
            }
          });
        } catch (error) {
          // Handle errors
          console.error('MetaMask error:', error);
        }
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
      fetchFacilities();
    }
  }, [address]);

  // Function to fetch facilities for the current address
  const fetchFacilities = async () => {
    if (!address) return;

    try {
      // Get all facilities for this address
      const allFacilities = await contract.methods.getFacilities().call({ from: address });
      
      // Format the facilities data
      const formattedFacilities = allFacilities.map(facility => ({
        facilityId: facility.facilityId.toString(),
        facilityName: facility.facilityName,
        facilityType: getFacilityTypeString(Number(facility.facilityType)),
        owner: facility.owner
      }));
      
      setFacilities(formattedFacilities);
      
      // If we have facilities and none is selected, select the first one
      if (formattedFacilities.length > 0 && !selectedFacility) {
        setSelectedFacility(formattedFacilities[0]);
      }
    } catch (e) {
      console.error('Error fetching facilities:', e);
    }
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

  // Function to handle facility selection
  const handleFacilitySelect = (facility) => {
    setSelectedFacility(facility);
  };

  // transportWasteRegistration function
  const transportWasteRegistration = async () => {
    try {
      // Check if the correct wallet is connected
      if (!isWalletCorrect) {
        alert(`Please connect with the Transport wallet: ${WALLET_CONFIG.TRANSPORT}`);
        return;
      }

      // Check if a facility is selected
      if (!selectedFacility) {
        alert('Please select a facility first');
        return;
      }

      // Validate hospital waste ID
      if (!newShipment.hospitalWasteId) {
        alert('Please enter a valid Hospital Waste ID');
        return;
      }

      const hospitalWasteId = parseInt(newShipment.hospitalWasteId);
      if (isNaN(hospitalWasteId) || hospitalWasteId <= 0) {
        alert('Hospital Waste ID must be a positive number');
        return;
      }

      console.log("Sending transaction with params:", {
        vehicleNumber: newShipment.No,
        status: newShipment.status,
        eArrival: newShipment.estimatedArrival,
        wasteRecorded: newShipment.waste,
        hospitalWasteId: hospitalWasteId,
        facilityId: selectedFacility.facilityId
      });

      const result = await contract.methods
        .registerTransportWaste(
          newShipment.No,
          newShipment.status,
          newShipment.estimatedArrival,
          newShipment.waste,
          hospitalWasteId,
          selectedFacility.facilityId // Pass the selected facility ID
        )
        .send({ from: address, gas: 3000000 });

      console.log("Transaction result:", result);
      
      // Improved event handling
      let wasteId;
      if (result.events && result.events.TransportWasteRegistered) {
        wasteId = result.events.TransportWasteRegistered.returnValues.wasteId;
        alert('Waste transport registered successfully with ID: ' + wasteId);
        
        // Refresh the transport wastes list
        fetchTransportWastes();
      } else {
        console.log("TransportWasteRegistered event not found in transaction result");
        alert('Waste transport registered successfully, but could not retrieve the waste ID. Check the transaction logs for details.');
        
        // Refresh anyway
        fetchTransportWastes();
      }
      
      // Clear form after successful submission
      setNewShipment({ id: '', No: '', status: '', estimatedArrival: '', waste: '', hospitalWasteId: '' });
    } catch (error) {
      console.error("Transaction error details:", error);
      alert('Error registering waste transport: ' + error.message);
    }
  };

  // Add this function to fetch transport wastes
  const fetchTransportWastes = async () => {
    if (!address) return;
    
    try {
      setLoadingWastes(true);
      setWasteError("");
      
      // Get all transport wastes for this address
      const wasteIds = await contract.methods.getTransportWastes().call({ from: address });
      console.log("Transport waste IDs:", wasteIds);
      
      if (!wasteIds || wasteIds.length === 0) {
        setTransportWastes([]);
        setLoadingWastes(false);
        return;
      }
      
      // Fetch details for each waste ID
      const wastesPromises = wasteIds.map(async (wasteId) => {
        try {
          const wasteData = await contract.methods.transportWastes(wasteId).call();
          
          // Get hospital waste details to show more information
          let hospitalWasteDetails = { totalWaste: "Unknown", totalBiomedicalWaste: "Unknown" };
          try {
            hospitalWasteDetails = await contract.methods.hospitalWastes(wasteData.hospitalWasteId).call();
          } catch (err) {
            console.warn(`Could not fetch hospital waste details for ID ${wasteData.hospitalWasteId}:`, err);
          }
          
          // Get facility details
          let facilityDetails = { facilityName: "Unknown" };
          try {
            facilityDetails = await contract.methods.facilitiesById(wasteData.facilityId).call();
          } catch (err) {
            console.warn(`Could not fetch facility details for ID ${wasteData.facilityId}:`, err);
          }
          
          return {
            ...wasteData,
            hospitalWasteDetails,
            facilityDetails,
            // Format timestamp if available
            formattedDate: new Date().toLocaleString() // Placeholder, replace with actual timestamp if available
          };
        } catch (err) {
          console.error(`Error fetching waste ID ${wasteId}:`, err);
          return null;
        }
      });
      
      const wastes = (await Promise.all(wastesPromises)).filter(waste => waste !== null);
      console.log("Fetched transport wastes:", wastes);
      setTransportWastes(wastes);
    } catch (error) {
      console.error("Error fetching transport wastes:", error);
      setWasteError("Failed to load transport wastes. Please try again.");
    } finally {
      setLoadingWastes(false);
    }
  };

  // Add this useEffect to fetch transport wastes when address changes
  useEffect(() => {
    if (address) {
      fetchTransportWastes();
    }
  }, [address]);

  return (
    <><Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Transport Waste Registration</h1>

        {/* Wallet Status */}
        <div className={`mb-4 p-4 rounded-lg ${isWalletCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
          <h2 className="text-xl font-bold mb-2">Wallet Status</h2>
          <div className="space-y-2">
            <p><strong>Connected Address:</strong> {address}</p>
            <p><strong>Required Wallet:</strong> {WALLET_CONFIG.TRANSPORT}</p>
            <p><strong>Status:</strong>
              {isWalletCorrect
                ? <span className="text-green-600 font-bold">✓ Correct wallet connected</span>
                : <span className="text-red-600 font-bold">✗ Incorrect wallet connected</span>}
            </p>
          </div>
        </div>

        {/* Facilities List */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Your Facilities</h2>
          {facilities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {facilities.map((facility) => (
                <div 
                  key={facility.facilityId}
                  className={`p-4 border rounded-lg cursor-pointer ${selectedFacility && selectedFacility.facilityId === facility.facilityId ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'}`}
                  onClick={() => handleFacilitySelect(facility)}
                >
                  <h3 className="font-bold">{facility.facilityName}</h3>
                  <p><strong>ID:</strong> {facility.facilityId}</p>
                  <p><strong>Type:</strong> {facility.facilityType}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No facilities registered yet. Please register a facility first.</p>
          )}
        </div>

        {/* Selected Facility Information */}
        {selectedFacility && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Selected Facility: {selectedFacility.facilityName}</h2>
          </div>
        )}

        {/* Form */}
        <form className="mb-8">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="hospitalWasteId">Hospital Waste ID</label>
            <input
              type="number"
              id="hospitalWasteId"
              name="hospitalWasteId"
              value={newShipment.hospitalWasteId}
              onChange={handleChange}
              className="border rounded-md px-4 py-2 w-full"
              placeholder="Enter Hospital Waste ID to link"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="No">Vehicle Number</label>
            <input
              type="text"
              id="No"
              name="No"
              value={newShipment.No}
              onChange={handleChange}
              className="border rounded-md px-4 py-2 w-full"
              placeholder="Enter vehicle number"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="status">Status</label>
            <input
              type="text"
              id="status"
              name="status"
              value={newShipment.status}
              onChange={handleChange}
              className="border rounded-md px-4 py-2 w-full"
              placeholder="Enter status"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="estimatedArrival">Estimated Arrival</label>
            <input
              type="text"
              id="estimatedArrival"
              name="estimatedArrival"
              value={newShipment.estimatedArrival}
              onChange={handleChange}
              className="border rounded-md px-4 py-2 w-full"
              placeholder="Enter estimated arrival"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="waste">Waste Description</label>
            <input
              type="text"
              id="waste"
              name="waste"
              value={newShipment.waste}
              onChange={handleChange}
              className="border rounded-md px-4 py-2 w-full"
              placeholder="Enter waste description"
              required
            />
          </div>

          <button
            type="button"
            onClick={transportWasteRegistration}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            disabled={!selectedFacility || !isWalletCorrect}
          >
            Register Transport Waste
          </button>
        </form>

        {/* Add this section to display registered transport wastes */}
        <div className="mb-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Your Registered Transport Wastes</h2>
            <button
              onClick={fetchTransportWastes}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
          
          {loadingWastes && (
            <div className="text-center py-4">
              <p className="text-gray-600">Loading transport wastes...</p>
            </div>
          )}
          
          {wasteError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <p className="text-red-700">{wasteError}</p>
            </div>
          )}
          
          {!loadingWastes && transportWastes.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-gray-600">No transport wastes registered yet.</p>
              <p className="text-gray-500 text-sm mt-2">Use the form above to register your first transport waste.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {transportWastes.map((waste) => (
                <div key={waste.wasteId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-800">Transport ID: {waste.wasteId}</h3>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      {waste.status}
                    </span>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    <p className="text-sm">
                      <span className="font-medium text-gray-700">Vehicle:</span> {waste.vehicleNumber}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-gray-700">Facility:</span> {waste.facilityDetails?.facilityName || `ID: ${waste.facilityId}`}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-gray-700">Hospital Waste ID:</span> {waste.hospitalWasteId}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-gray-700">Waste Description:</span> {waste.wasteRecorded}
                    </p>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Estimated Arrival:</span> {waste.estimatedArrival}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Registered on: {waste.formattedDate}
                    </p>
                  </div>
                  
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <p className="text-sm">
                      <span className="font-medium text-gray-700">Hospital Waste Details:</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      Total Waste: {waste.hospitalWasteDetails?.totalWaste || "Unknown"} kg
                    </p>
                    <p className="text-xs text-gray-600">
                      Biomedical Waste: {waste.hospitalWasteDetails?.totalBiomedicalWaste || "Unknown"} kg
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div></>
  );
}

export default Tracking;
