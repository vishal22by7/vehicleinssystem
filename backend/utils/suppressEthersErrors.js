/**
 * Global error suppressor for ethers.js JsonRpcProvider network detection errors
 * This prevents spam when blockchain node is not available
 */

let isSuppressed = false;

function suppressEthersNetworkErrors() {
  if (isSuppressed) return;
  
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Override console.error to filter ethers network errors
  console.error = function(...args) {
    const message = args[0]?.toString() || '';
    // Suppress JsonRpcProvider network detection errors
    if (message.includes('JsonRpcProvider failed to detect network')) {
      return; // Suppress this error completely
    }
    originalError.apply(console, args);
  };
  
  // Also check console.warn in case ethers uses it
  console.warn = function(...args) {
    const message = args[0]?.toString() || '';
    if (message.includes('JsonRpcProvider failed to detect network')) {
      return; // Suppress this warning
    }
    originalWarn.apply(console, args);
  };
  
  isSuppressed = true;
}

// Suppress errors immediately when module is loaded
suppressEthersNetworkErrors();

module.exports = { suppressEthersNetworkErrors };

