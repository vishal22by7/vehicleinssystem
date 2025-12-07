# 📦 Data Storage Guide - VIMS Project

This document explains where all data and files are stored in the VIMS system.

---

## 🗄️ Database Storage (PostgreSQL)

### Location
- **Database Name:** `vims`
- **Host:** `localhost:5432` (default)
- **Connection:** Configured in `backend/.env`

### What's Stored in Database

#### 1. **User Data** (`users` table)
- User accounts, passwords (hashed), profiles
- Email, phone, address, PAN, KYC details

#### 2. **Policy Types** (`policy_types` table)
- Policy type definitions (Comprehensive, TP, OD, etc.)
- Base rates, age factors, engine factors
- Add-on configurations

#### 3. **Policies** (`policies` table)
- **All form data** from the buy policy form:
  - Vehicle details (make, model, variant, engine capacity, etc.)
  - Registration information
  - Owner/proposer details
  - Nominee information
  - Previous policy details
  - Premium breakdown
  - Policy dates (start/end)
  - Policy status
  - **Document metadata** (file paths, IPFS CIDs)
  - Blockchain transaction hashes

#### 4. **Claims** (`claims` table)
- Claim submissions
- Claim status, descriptions
- ML analysis results
- Blockchain records

#### 5. **Claim Photos** (`claim_photos` table)
- Photo metadata
- IPFS CIDs for photos
- URLs and blockchain status

#### 6. **Blockchain Records** (`blockchain_records` table)
- Transaction hashes
- Entity types and IDs
- Timestamps

---

## 📁 File Storage (Local Filesystem)

### Location
**Policy Documents:**
```
backend/uploads/policies/
```

**Claim Photos:**
```
backend/uploads/
```

### What Files Are Stored

#### Policy Documents (in `backend/uploads/policies/`)
- **RC Document** (Registration Certificate) - **REQUIRED**
- Sales Invoice (optional)
- Previous Policy Copy (optional)
- PUC Certificate (optional)
- Driving License (optional)
- Vehicle Photos (up to 6 photos)

#### File Naming Convention
Files are stored with unique names:
```
{timestamp}-{random}-{original-filename}
Example: 1733567890123-123456789-rc-document.pdf
```

### File Storage Process

1. **Upload:** User uploads file via form
2. **Temporary Storage:** File stored in `backend/uploads/policies/` by multer
3. **IPFS Upload (Optional):** If IPFS is available, file is also uploaded to IPFS
4. **Database Record:** File path and IPFS CID stored in `policies.documents` JSONB field
5. **Permanent Storage:** File remains on server filesystem

---

## 🌐 IPFS Storage (Optional - Decentralized)

### What is IPFS?
InterPlanetary File System - A decentralized file storage system.

### When IPFS is Used
- If IPFS service is configured and available
- Files are uploaded to IPFS **in addition to** local storage
- IPFS Content IDs (CIDs) are stored in the database

### IPFS Storage Location
- Files are stored on IPFS network nodes
- Accessible via IPFS gateway URLs
- Example: `https://ipfs.io/ipfs/{CID}`

### What Gets Stored on IPFS
- RC Documents
- Sales Invoices
- Previous Policy Copies
- PUC Certificates
- Driving Licenses
- Vehicle Photos
- Claim Photos
- ML Analysis Reports

---

## ⛓️ Blockchain Storage (Ethereum/Hardhat)

### Location
- **Local Node:** `http://localhost:8545` (Hardhat)
- **Network:** Local development network (chainId: 31337)

### What's Stored on Blockchain
- **Policy Records:**
  - Policy ID
  - User ID
  - Premium amount
  - Start/End dates
  - Transaction hash

- **Claim Records:**
  - Claim ID
  - Policy ID
  - Description
  - IPFS CIDs for evidence
  - ML analysis results
  - Status

### Blockchain Data Format
- Stored as smart contract events
- Transaction hashes stored in database
- Immutable and verifiable

---

## 📊 Complete Data Flow

### When User Buys a Policy:

1. **Frontend Form** → User fills form
2. **Files** → Stored in browser memory (`window.__policyFiles`)
3. **Form Data** → Stored in `sessionStorage` temporarily
4. **Payment Page** → Files and data combined into FormData
5. **Backend Receives:**
   - Form data → Parsed and validated
   - Files → Saved to `backend/uploads/policies/`
6. **Database:**
   - Policy record created in `policies` table
   - All form fields stored
   - File paths stored in `documents` JSONB field
7. **IPFS (if available):**
   - Files uploaded to IPFS
   - CIDs stored in database
8. **Blockchain (if available):**
   - Policy record written to smart contract
   - Transaction hash stored in database

---

## 🔍 How to Find Stored Data

### View Database Data
```bash
# Connect to PostgreSQL
psql -U postgres -d vims

# View all policies
SELECT id, "registrationNumber", premium, status FROM policies;

# View policy documents
SELECT id, "registrationNumber", documents FROM policies;

# View file paths
SELECT id, "registrationNumber", 
       documents->>'rcDocument'->>'path' as rc_path
FROM policies;
```

### View Files on Disk
```bash
# Windows PowerShell
cd backend\uploads\policies
dir

# List all files
Get-ChildItem -Recurse
```

### View IPFS CIDs
```bash
# In database
SELECT id, "registrationNumber",
       documents->>'rcDocument'->>'ipfsCid' as rc_ipfs_cid
FROM policies
WHERE documents->>'rcDocument'->>'ipfsCid' IS NOT NULL;
```

---

## 📝 File Structure Summary

```
vims-project/
├── backend/
│   ├── uploads/
│   │   ├── policies/          ← Policy documents stored here
│   │   │   ├── {timestamp}-{random}-rc-document.pdf
│   │   │   ├── {timestamp}-{random}-sales-invoice.pdf
│   │   │   └── ...
│   │   └── {claimId}_{filename}  ← Claim photos stored here
│   └── .env                    ← Database connection config
│
├── Database (PostgreSQL):
│   └── vims database
│       ├── users
│       ├── policies            ← All form data + file metadata
│       ├── policy_types
│       ├── claims
│       ├── claim_photos
│       └── blockchain_records
│
└── Blockchain (if running):
    └── Hardhat node (localhost:8545)
        └── Smart contracts store policy/claim records
```

---

## 🔐 Security Notes

1. **File Access:** Files are stored on server filesystem - not directly accessible via web
2. **Database:** All sensitive data (passwords) is hashed
3. **File Validation:** Only JPG, PNG, PDF allowed (max 5MB)
4. **IPFS:** Files on IPFS are publicly accessible via CID (if you know the CID)

---

## 🧹 Cleanup

### Remove Old Files
```bash
# Delete files older than 1 year (example)
# Files are in: backend/uploads/policies/
```

### Database Cleanup
- Policies are soft-deleted (status changed)
- Files remain on disk even if policy is deleted
- Manual cleanup may be needed for old files

---

## 📞 Need Help?

- **Database Issues:** Check `backend/.env` for connection settings
- **File Upload Issues:** Check `backend/uploads/policies/` directory permissions
- **IPFS Issues:** Check IPFS service configuration
- **Blockchain Issues:** Ensure Hardhat node is running

