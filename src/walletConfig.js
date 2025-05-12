// Updated wallet configuration for single-wallet approach
export const WALLET_CONFIG = {
  // We'll keep this for backward compatibility but won't enforce specific wallets for roles
  FACILITY_REGISTRATION: "0xEa02358a3555Cd6d4dC078Da25761Cc5d8b206d5",
  SEGREGATION: "0x80D7eEbbc03f55527C99c834EC6CFE03375fc8Ff",
  TRANSPORT: "0x5fB36Cc181d142a03357E169D6445ED364474D79",
  DISPOSAL: "0x845C35c73216B9F7EB1ff06676C83b7B911EB99e"
};

// Updated function to check if a wallet is connected (no role-specific checks)
export const isWalletConnected = (address) => {
  return address && address.length > 0;
};

// This function is kept for backward compatibility but now always returns true
export const isCorrectWallet = () => {
  return true;
};

// Add function to check if address is admin
export const isAdmin = (address) => {
  if (!address) return false;
  return address.toLowerCase() === WALLET_CONFIG.ADMIN.toLowerCase();
};

// Function to get the required wallet for a functionality
export const getRequiredWallet = (functionality) => {
  return WALLET_CONFIG[functionality];
};




