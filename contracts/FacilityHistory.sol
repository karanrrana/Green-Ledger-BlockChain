// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FacilityHistory {
    struct HistoryEntry {
        uint256 timestamp;
        string action;
        string details;
        bytes32 transactionHash;
    }

    mapping(uint256 => HistoryEntry[]) private facilityHistory;

    event HistoryAdded(uint256 facilityId, string action, string details);

    function addToHistory(uint256 _facilityId, string memory _action, string memory _details) internal {
        HistoryEntry memory newEntry = HistoryEntry({
            timestamp: block.timestamp,
            action: _action,
            details: _details,
            transactionHash: blockhash(block.number - 1)
        });

        facilityHistory[_facilityId].push(newEntry);
        emit HistoryAdded(_facilityId, _action, _details);
    }

    function getFacilityHistory(uint256 _facilityId) public view returns (HistoryEntry[] memory) {
        return facilityHistory[_facilityId];
    }
}