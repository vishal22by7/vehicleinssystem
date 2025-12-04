const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { Readable } = require('stream');

// IPFS client is optional - handle import gracefully
// ipfs-http-client v60+ is ESM-only, so we use dynamic import()
let ipfsClient = null;
let ipfsAvailable = false;
let ipfsLoadPromise = null;

// Load IPFS client asynchronously using dynamic import (for ESM modules)
async function loadIPFSClient() {
  if (ipfsLoadPromise) {
    return ipfsLoadPromise;
  }
  
  ipfsLoadPromise = (async () => {
    try {
      // Use dynamic import for ESM modules (ipfs-http-client v60+)
      const ipfsModule = await import('ipfs-http-client');
      ipfsClient = ipfsModule.default || ipfsModule;
      ipfsAvailable = true;
      return true;
    } catch (error) {
      // IPFS client not available - this is OK, we'll disable IPFS features
      ipfsAvailable = false;
      ipfsClient = null;
      return false;
    }
  })();
  
  return ipfsLoadPromise;
}

class IPFSService {
  constructor() {
    this.ipfs = null;
    // IPFS API URL should include /api/v0 if not already included
    const baseApiUrl = process.env.IPFS_API_URL || 'http://localhost:5001';
    this.apiUrl = baseApiUrl.includes('/api/v0') ? baseApiUrl : `${baseApiUrl}/api/v0`;
    this.gatewayUrl = process.env.IPFS_GATEWAY_URL || 'http://localhost:8080/ipfs';
    this.pinataApiKey = process.env.PINATA_API_KEY || null;
    this.pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY || null;
    this.pinataJWT = process.env.PINATA_JWT || null;
    this.pinataGateway = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
    this.usePinata = Boolean(this.pinataJWT || (this.pinataApiKey && this.pinataSecretApiKey));
    this.ipfsAvailable = false;
    this.initialized = false;
    
    if (this.usePinata) {
      this.ipfsAvailable = true;
      this.initialized = true;
      console.log('✅ IPFS service configured to use Pinata');
      console.log('   Uploads will be pinned via Pinata API');
    } else {
      // Start loading IPFS client asynchronously
      this.initialize();
    }
  }

  async initialize() {
    // Load IPFS client module
    const loaded = await loadIPFSClient();
    
    if (!loaded) {
      console.warn('⚠️  IPFS client not available, IPFS features disabled');
      console.warn('   This is OK for development. Photos will be saved locally.');
      console.warn('   To enable IPFS: Install ipfs-http-client and start IPFS daemon');
      this.ipfsAvailable = false;
      return;
    }
    
    // Initialize IPFS connection
    await this.init();
  }

  async init() {
    if (!ipfsAvailable || !ipfsClient) {
      return;
    }
    
    try {
      // Handle different IPFS client versions
      let createFn = null;
      if (typeof ipfsClient === 'function') {
        createFn = ipfsClient;
      } else if (ipfsClient.create) {
        createFn = ipfsClient.create;
      } else if (ipfsClient.default && ipfsClient.default.create) {
        createFn = ipfsClient.default.create;
      }
      
      if (createFn) {
        // Try to connect to IPFS - if it fails, we'll handle gracefully
        try {
          this.ipfs = await createFn({ url: this.apiUrl });
          // Test connection by trying to get version (non-blocking)
          this.ipfsAvailable = true;
          this.initialized = true;
          console.log('✅ IPFS service initialized');
          console.log(`   API URL: ${this.apiUrl}`);
          console.log(`   Gateway URL: ${this.gatewayUrl}`);
        } catch (connectError) {
          // IPFS daemon not running - this is OK
          console.warn('⚠️  IPFS daemon not available at', this.apiUrl);
          console.warn('   IPFS features disabled. System will work without IPFS.');
          this.ipfsAvailable = false;
          this.initialized = true; // Mark as initialized so we don't keep trying
        }
      } else {
        throw new Error('IPFS create function not found');
      }
    } catch (error) {
      console.warn('⚠️  IPFS initialization failed:', error.message);
      console.warn('   IPFS features disabled. Photos will be saved locally.');
      console.warn('   Make sure IPFS daemon is running: ipfs daemon');
      this.ipfsAvailable = false;
      this.initialized = false;
    }
  }

  async uploadFile(filePath, fileName) {
    // Wait for initialization if still in progress
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (this.usePinata) {
      return this.uploadViaPinata(fs.createReadStream(filePath), fileName);
    }

    if (!this.ipfsAvailable || !this.ipfs) {
      console.warn('⚠️  IPFS not available, skipping upload');
      return null;
    }
    
    return this.uploadViaLocalIPFS(fs.readFileSync(filePath), fileName);
  }

  async uploadBuffer(buffer, fileName) {
    // Wait for initialization if still in progress
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (this.usePinata) {
      const stream = Readable.from(buffer);
      return this.uploadViaPinata(stream, fileName);
    }

    if (!this.ipfsAvailable || !this.ipfs) {
      console.warn('⚠️  IPFS not available, skipping upload');
      return null;
    }
    
    return this.uploadViaLocalIPFS(buffer, fileName);
  }
  
  isAvailable() {
    return this.usePinata || (this.ipfsAvailable && this.ipfs !== null);
  }

  getGatewayUrl(cid) {
    return `${this.gatewayUrl}/${cid}`;
  }

  async uploadViaPinata(stream, fileName) {
    try {
      const formData = new FormData();
      formData.append('file', stream, { filename: fileName });
      formData.append('pinataMetadata', JSON.stringify({ name: fileName }));
      formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));
      
      const headers = {
        ...formData.getHeaders()
      };

      if (this.pinataJWT) {
        headers.Authorization = `Bearer ${this.pinataJWT}`;
      } else {
        headers.pinata_api_key = this.pinataApiKey;
        headers.pinata_secret_api_key = this.pinataSecretApiKey;
      }

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers,
          maxBodyLength: Infinity
        }
      );

      const cid = response.data.IpfsHash;
      const gatewayBase = this.pinataGateway.replace(/\/$/, '');
      return { cid, url: `${gatewayBase}/${cid}` };
    } catch (error) {
      console.error('Pinata upload error:', error.response?.data || error.message);
      return null;
    }
  }

  async uploadViaLocalIPFS(content, fileName) {
    try {
      const result = await this.ipfs.add({
        path: fileName,
        content
      });

      const cid = result.cid.toString();
      const url = `${this.gatewayUrl}/${cid}`;

      return { cid, url };
    } catch (error) {
      console.error('IPFS upload error:', error.message);
      return null;
    }
  }
}

module.exports = new IPFSService();

