// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./FacilityHistory.sol";

contract WasteManagement is FacilityHistory {
    enum FacilityType { Hospital, Transport, Treatment, Clinic, Lab }
    
    struct Facility {
        uint256 facilityId;
        string facilityName;
        FacilityType facilityType;
        address owner;
    }

    struct HospitalWaste {
        uint256 wasteId;
        bool isSegregationDone;
        uint256 totalWaste;
        uint256 totalBiomedicalWaste;
        bool storageProperlyDone;
        bool binsNotOverflowing;
        bool wasteStored24Hours;
        uint256 temperatureRecorded;
        uint256 facilityId;
        address owner;
    }

    struct TransportWaste {
        uint256 wasteId;
        string vehicleNumber;
        string status;
        string estimatedArrival;
        string wasteRecorded;
        uint256 hospitalWasteId;
        uint256 facilityId;
        address owner;
    }

    struct DisposalWaste {
        uint256 wasteId;
        uint256 disposalInfo;
        bool isSegregated;
        uint256 treatmentInfo;
        bool otherTreatment;
        uint256 transportWasteId;
        uint256 facilityId;
        address owner;
    }

    // Mappings for facilities
    mapping(address => Facility[]) public facilitiesByAddress;
    mapping(uint256 => Facility) public facilitiesById;
    uint256 private facilityCounter;

    // Mappings for hospital waste
    mapping(uint256 => HospitalWaste) public hospitalWastes;
    mapping(address => uint256[]) public hospitalWastesByAddress;
    uint256 private hospitalWasteCounter;

    // Mappings for transport waste
    mapping(uint256 => TransportWaste) public transportWastes;
    mapping(address => uint256[]) public transportWastesByAddress;
    uint256 private transportWasteCounter;

    // Mappings for disposal waste
    mapping(uint256 => DisposalWaste) public disposalWastes;
    mapping(address => uint256[]) public disposalWastesByAddress;
    uint256 private disposalWasteCounter;

    // Mappings for authorized users
    mapping(uint256 => mapping(address => bool)) public authorizedUsers;

    // Add a mapping to track which facilities are registered for which functionality
    struct FacilityCapabilities {
        bool canSegregateWaste;
        bool canTransportWaste;
        bool canDisposeWaste;
    }
    
    // Map facility IDs to their capabilities
    mapping(uint256 => FacilityCapabilities) public facilityCapabilities;
    
    // Add events for capability registration
    event FacilityCapabilityUpdated(uint256 facilityId, string capability, bool enabled);

    // Events
    event FacilityRegistered(uint256 facilityId, string name, FacilityType facilityType, address owner);
    event HospitalWasteRegistered(uint256 wasteId, bool isSegregationDone, uint256 facilityId);
    event TransportWasteRegistered(uint256 wasteId, string vehicleNumber, uint256 hospitalWasteId, uint256 facilityId);
    event DisposalWasteRegistered(uint256 wasteId, uint256 disposalInfo, uint256 transportWasteId, uint256 facilityId);

    // Contract owner
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // Helper function to check if the sender owns a valid facility
    function ownsValidFacility(uint256 _facilityId) public view returns (bool) {
        // Check if the facility exists
        if (_facilityId == 0 || _facilityId > facilityCounter) {
            return false;
        }
        
        // Get the facility
        Facility memory facility = facilitiesById[_facilityId];
        
        // Check if the sender is the owner or an authorized user
        return (facility.owner == msg.sender || authorizedUsers[_facilityId][msg.sender]);
    }
    
    // Register a new facility
    function registerFacility(string memory _name, FacilityType _type) public {
        facilityCounter++;
        uint256 newFacilityId = facilityCounter;
        
        Facility memory newFacility = Facility({
            facilityId: newFacilityId,
            facilityName: _name,
            facilityType: _type,
            owner: msg.sender
        });
        
        // Add to the array of facilities for this address
        facilitiesByAddress[msg.sender].push(newFacility);
        // Also store in the ID mapping for easy lookup
        facilitiesById[newFacilityId] = newFacility;

        // Add to history
        addToHistory(
            newFacilityId,
            "REGISTRATION",
            string(abi.encodePacked("Facility registered with name: ", _name))
        );

        emit FacilityRegistered(newFacilityId, _name, _type, msg.sender);
    }
    
    // Get facilities for the sender
    function getFacilities() public view returns (Facility[] memory) {
        return facilitiesByAddress[msg.sender];
    }
    
    // Get facility by ID
    function getFacility(uint256 _id) public view returns (Facility memory) {
        require(facilitiesById[_id].facilityId > 0, "Facility not found");
        return facilitiesById[_id];
    }
    
    // Register hospital waste with facility ID
    function registerHospitalWaste(
        bool _isSegregationDone,
        uint256 _totalWaste,
        uint256 _totalBiomedicalWaste,
        bool _storageProperlyDone,
        bool _binsNotOverflowing,
        bool _wasteStored24Hours,
        uint256 _temperatureRecorded,
        uint256 _facilityId
    ) public {
        // Verify the facility belongs to the sender
        require(ownsValidFacility(_facilityId), "You don't own this facility or it doesn't exist");
        
        // Check if the facility has segregation capability
        require(facilityCapabilities[_facilityId].canSegregateWaste, "This facility is not registered for waste segregation");
        
        hospitalWasteCounter++;
        uint256 newWasteId = hospitalWasteCounter;
        
        HospitalWaste memory newWaste = HospitalWaste({
            wasteId: newWasteId,
            isSegregationDone: _isSegregationDone,
            totalWaste: _totalWaste,
            totalBiomedicalWaste: _totalBiomedicalWaste,
            storageProperlyDone: _storageProperlyDone,
            binsNotOverflowing: _binsNotOverflowing,
            wasteStored24Hours: _wasteStored24Hours,
            temperatureRecorded: _temperatureRecorded,
            facilityId: _facilityId,
            owner: msg.sender
        });
        
        hospitalWastes[newWasteId] = newWaste;
        hospitalWastesByAddress[msg.sender].push(newWasteId);
        
        // Add to history
        addToHistory(
            _facilityId,
            "HOSPITAL_WASTE",
            string(abi.encodePacked("Hospital waste registered with ID: ", toString(newWasteId)))
        );
        
        emit HospitalWasteRegistered(newWasteId, _isSegregationDone, _facilityId);
    }
    
    // For backward compatibility
    function registerHospitalWaste(
        bool _isSegregationDone,
        uint256 _totalWaste,
        uint256 _totalBiomedicalWaste,
        bool _storageProperlyDone,
        bool _binsNotOverflowing,
        bool _wasteStored24Hours,
        uint256 _temperatureRecorded
    ) public {
        // Get the first facility for this address
        require(facilitiesByAddress[msg.sender].length > 0, "No facilities registered for this address");
        uint256 facilityId = facilitiesByAddress[msg.sender][0].facilityId;
        
        registerHospitalWaste(
            _isSegregationDone,
            _totalWaste,
            _totalBiomedicalWaste,
            _storageProperlyDone,
            _binsNotOverflowing,
            _wasteStored24Hours,
            _temperatureRecorded,
            facilityId
        );
    }
    
    // Register transport waste with facility ID
    function registerTransportWaste(
        string memory _vehicleNumber,
        string memory _status,
        string memory _estimatedArrival,
        string memory _wasteRecorded,
        uint256 _hospitalWasteId,
        uint256 _facilityId
    ) public {
        // Verify the facility belongs to the sender
        require(ownsValidFacility(_facilityId), "You don't own this facility or it doesn't exist");
        
        // Verify hospital waste exists
        require(hospitalWastes[_hospitalWasteId].wasteId > 0, "Hospital waste not found");
        
        // Check if the facility has transport capability
        require(facilityCapabilities[_facilityId].canTransportWaste, "This facility is not registered for waste transport");
        
        transportWasteCounter++;
        uint256 newWasteId = transportWasteCounter;
        
        TransportWaste memory newWaste = TransportWaste({
            wasteId: newWasteId,
            vehicleNumber: _vehicleNumber,
            status: _status,
            estimatedArrival: _estimatedArrival,
            wasteRecorded: _wasteRecorded,
            hospitalWasteId: _hospitalWasteId,
            facilityId: _facilityId,
            owner: msg.sender
        });
        
        transportWastes[newWasteId] = newWaste;
        transportWastesByAddress[msg.sender].push(newWasteId);
        
        // Add to history
        addToHistory(
            _facilityId,
            "TRANSPORT_WASTE",
            string(abi.encodePacked("Transport waste registered with ID: ", toString(newWasteId)))
        );
        
        emit TransportWasteRegistered(newWasteId, _vehicleNumber, _hospitalWasteId, _facilityId);
    }
    
    // For backward compatibility
    function registerTransportWaste(
        string memory _vehicleNumber,
        string memory _status,
        string memory _estimatedArrival,
        string memory _wasteRecorded,
        uint256 _hospitalWasteId
    ) public {
        // Get the first facility for this address
        require(facilitiesByAddress[msg.sender].length > 0, "No facilities registered for this address");
        uint256 facilityId = facilitiesByAddress[msg.sender][0].facilityId;
        
        registerTransportWaste(
            _vehicleNumber,
            _status,
            _estimatedArrival,
            _wasteRecorded,
            _hospitalWasteId,
            facilityId
        );
    }
    
    // Register disposal waste with facility ID
    function registerDisposalWaste(
        uint256 _disposalInfo,
        bool _isSegregated,
        uint256 _treatmentInfo,
        bool _otherTreatment,
        uint256 _transportWasteId,
        uint256 _facilityId
    ) public {
        // Verify the facility belongs to the sender
        require(ownsValidFacility(_facilityId), "You don't own this facility or it doesn't exist");
        
        // Verify transport waste exists
        require(transportWastes[_transportWasteId].wasteId > 0, "Transport waste not found");
        
        // Check if the facility has disposal capability
        require(facilityCapabilities[_facilityId].canDisposeWaste, "This facility is not registered for waste disposal");
        
        disposalWasteCounter++;
        uint256 newWasteId = disposalWasteCounter;
        
        DisposalWaste memory newWaste = DisposalWaste({
            wasteId: newWasteId,
            disposalInfo: _disposalInfo,
            isSegregated: _isSegregated,
            treatmentInfo: _treatmentInfo,
            otherTreatment: _otherTreatment,
            transportWasteId: _transportWasteId,
            facilityId: _facilityId,
            owner: msg.sender
        });
        
        disposalWastes[newWasteId] = newWaste;
        disposalWastesByAddress[msg.sender].push(newWasteId);
        
        // Add to history
        addToHistory(
            _facilityId,
            "DISPOSAL_WASTE",
            string(abi.encodePacked("Disposal waste registered with ID: ", toString(newWasteId)))
        );
        
        emit DisposalWasteRegistered(newWasteId, _disposalInfo, _transportWasteId, _facilityId);
    }
    
    // For backward compatibility
    function registerDisposalWaste(
        uint256 _disposalInfo,
        bool _isSegregated,
        uint256 _treatmentInfo,
        bool _otherTreatment,
        uint256 _transportWasteId
    ) public {
        // Get the first facility for this address
        require(facilitiesByAddress[msg.sender].length > 0, "No facilities registered for this address");
        uint256 facilityId = facilitiesByAddress[msg.sender][0].facilityId;
        
        registerDisposalWaste(
            _disposalInfo,
            _isSegregated,
            _treatmentInfo,
            _otherTreatment,
            _transportWasteId,
            facilityId
        );
    }
    
    // Get hospital wastes for the sender
    function getHospitalWastes() public view returns (uint256[] memory) {
        return hospitalWastesByAddress[msg.sender];
    }
    
    // Get transport wastes for the sender
    function getTransportWastes() public view returns (uint256[] memory) {
        return transportWastesByAddress[msg.sender];
    }
    
    // Get disposal wastes for the sender
    function getDisposalWastes() public view returns (uint256[] memory) {
        return disposalWastesByAddress[msg.sender];
    }
    
    // Get hospital waste by ID
    function getHospitalWasteById(uint256 _id) public view returns (HospitalWaste memory) {
        require(hospitalWastes[_id].wasteId > 0, "Hospital waste not found");
        return hospitalWastes[_id];
    }
    
    // Get transport waste by ID
    function getTransportWasteById(uint256 _id) public view returns (TransportWaste memory) {
        require(transportWastes[_id].wasteId > 0, "Transport waste not found");
        return transportWastes[_id];
    }
    
    // Get disposal waste by ID
    function getDisposalWasteById(uint256 _id) public view returns (DisposalWaste memory) {
        require(disposalWastes[_id].wasteId > 0, "Disposal waste not found");
        return disposalWastes[_id];
    }
    
    // Helper function to convert uint to string
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    // Add a function to authorize users for a facility
    function authorizeFacilityUser(uint256 _facilityId, address _user) public {
        // Check if the sender owns the facility
        require(ownsValidFacility(_facilityId), "You don't own this facility");
        
        // Authorize the user
        authorizedUsers[_facilityId][_user] = true;
        
        // Add to history
        addToHistory(
            _facilityId,
            "AUTHORIZATION",
            string(abi.encodePacked("User authorized: ", addressToString(_user)))
        );
    }

    // Add a function to revoke authorization
    function revokeFacilityAuthorization(uint256 _facilityId, address _user) public {
        // Check if the sender owns the facility
        require(ownsValidFacility(_facilityId), "You don't own this facility");
        
        // Revoke authorization
        authorizedUsers[_facilityId][_user] = false;
        
        // Add to history
        addToHistory(
            _facilityId,
            "AUTHORIZATION_REVOKED",
            string(abi.encodePacked("User authorization revoked: ", addressToString(_user)))
        );
    }

    // Helper function to convert address to string
    function addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3+i*2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }

    // Add a function to check if an address is authorized for a facility
    function isAuthorizedForFacility(uint256 _facilityId, address _user) public view returns (bool) {
        return authorizedUsers[_facilityId][_user];
    }

    // Add a function to get all authorized users for a facility
    function getAuthorizedUsers(uint256 _facilityId) public view returns (address[] memory) {
        // This is a simplified implementation that doesn't return all users
        // A complete implementation would require tracking all authorized addresses
        // For now, we'll just check if the caller is authorized
        require(ownsValidFacility(_facilityId), "You don't own this facility");
        
        // Return an empty array for now
        address[] memory users = new address[](0);
        return users;
    }

    // Add functions to enable/disable capabilities for a facility
    function setFacilityCapability(uint256 _facilityId, string memory _capability, bool _enabled) public {
        // Verify the facility belongs to the sender
        require(ownsValidFacility(_facilityId), "You don't own this facility or it doesn't exist");
        
        FacilityCapabilities storage capabilities = facilityCapabilities[_facilityId];
        
        if (keccak256(abi.encodePacked(_capability)) == keccak256(abi.encodePacked("segregate"))) {
            capabilities.canSegregateWaste = _enabled;
        } else if (keccak256(abi.encodePacked(_capability)) == keccak256(abi.encodePacked("transport"))) {
            capabilities.canTransportWaste = _enabled;
        } else if (keccak256(abi.encodePacked(_capability)) == keccak256(abi.encodePacked("dispose"))) {
            capabilities.canDisposeWaste = _enabled;
        } else {
            revert("Invalid capability");
        }
        
        // Add to history
        addToHistory(
            _facilityId,
            "CAPABILITY_UPDATE",
            string(abi.encodePacked("Facility capability updated: ", _capability, " set to ", _enabled ? "enabled" : "disabled"))
        );
        
        emit FacilityCapabilityUpdated(_facilityId, _capability, _enabled);
    }
    
    // Helper functions to check capabilities
    function canFacilitySegregateWaste(uint256 _facilityId) public view returns (bool) {
        return facilityCapabilities[_facilityId].canSegregateWaste;
    }
    
    function canFacilityTransportWaste(uint256 _facilityId) public view returns (bool) {
        return facilityCapabilities[_facilityId].canTransportWaste;
    }
    
    function canFacilityDisposeWaste(uint256 _facilityId) public view returns (bool) {
        return facilityCapabilities[_facilityId].canDisposeWaste;
    }
    
    // Add a convenience function to enable all capabilities at once
    function enableAllCapabilities(uint256 _facilityId) public {
        require(ownsValidFacility(_facilityId), "You don't own this facility or it doesn't exist");
        
        facilityCapabilities[_facilityId].canSegregateWaste = true;
        facilityCapabilities[_facilityId].canTransportWaste = true;
        facilityCapabilities[_facilityId].canDisposeWaste = true;
        
        // Add to history
        addToHistory(
            _facilityId,
            "CAPABILITY_UPDATE",
            "All facility capabilities enabled"
        );
        
        emit FacilityCapabilityUpdated(_facilityId, "segregate", true);
        emit FacilityCapabilityUpdated(_facilityId, "transport", true);
        emit FacilityCapabilityUpdated(_facilityId, "dispose", true);
    }
}

