import { Web3 } from 'web3';
import ABI from '../ABI.json';
import { WASTE_MANAGEMENT_ADDRESS } from "../config";

const contractAddress = WASTE_MANAGEMENT_ADDRESS;

export const testUIDChain = async (segregationUID) => {
  const web3 = new Web3(window.ethereum);
  const accounts = await web3.eth.getAccounts();
  const address = accounts[0];
  const contract = new web3.eth.Contract(ABI, contractAddress);

  try {
    // Get segregation data
    const segregationData = await contract.methods
      .getHospitalWasteId(segregationUID)
      .call({ from: address });

    // Get linked transport data
    const transportUID = segregationData.linkedTransportUID;
    const transportData = transportUID ?
      await contract.methods.getTransportWasteId(transportUID).call({ from: address }) :
      null;

    // Get linked disposal data
    const disposalUID = transportData?.linkedDisposalUID;
    const disposalData = disposalUID ?
      await contract.methods.getDisposalWasteId(disposalUID).call({ from: address }) :
      null;

    return {
      segregation: { uid: segregationUID, data: segregationData },
      transport: { uid: transportUID, data: transportData },
      disposal: { uid: disposalUID, data: disposalData }
    };
  } catch (error) {
    console.error("Error testing UID chain:", error);
    return {
      error: error.message
    };
  }
};



