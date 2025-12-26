#!/usr/bin/env node
/**
 * Verify Record Script
 * 
 * Verifies that a policy or claim record's on-chain data matches the database
 * and optionally validates IPFS content.
 * 
 * Usage:
 *   node scripts/verify-record.js policy <policyId>
 *   node scripts/verify-record.js claim <claimId>
 *   node scripts/verify-record.js --all-policies
 *   node scripts/verify-record.js --all-claims
 */

require('dotenv').config();
const crypto = require('crypto');
const axios = require('axios');
const { ethers } = require('ethers');

// Import models
const { Policy, Claim, ClaimPhoto, BlockchainRecord } = require('../models/sequelize');

// Configuration
const BLOCKCHAIN_RPC_URL = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545';
const IPFS_GATEWAY = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
const ETHERSCAN_URL = 'https://sepolia.etherscan.io';

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

/**
 * Calculate content hash for verification
 */
function calculateContentHash(data) {
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Fetch content from IPFS
 */
async function fetchFromIPFS(cid) {
    if (!cid) return null;

    try {
        const url = `${IPFS_GATEWAY}/${cid}`;
        const response = await axios.get(url, { timeout: 15000 });
        return response.data;
    } catch (error) {
        logWarning(`Could not fetch from IPFS (CID: ${cid}): ${error.message}`);
        return null;
    }
}

/**
 * Check if transaction exists on blockchain
 */
async function verifyTransaction(txHash) {
    if (!txHash) return { exists: false, error: 'No transaction hash' };

    try {
        const provider = new ethers.JsonRpcProvider(BLOCKCHAIN_RPC_URL);
        const tx = await provider.getTransaction(txHash);
        const receipt = await provider.getTransactionReceipt(txHash);

        if (tx && receipt) {
            return {
                exists: true,
                blockNumber: receipt.blockNumber,
                status: receipt.status === 1 ? 'Success' : 'Failed',
                gasUsed: receipt.gasUsed?.toString(),
                from: tx.from,
                to: tx.to
            };
        }
        return { exists: false, error: 'Transaction not found' };
    } catch (error) {
        // If local node not running, provide explorer link
        return {
            exists: null,
            error: `Could not verify on local node: ${error.message}`,
            explorerUrl: `${ETHERSCAN_URL}/tx/${txHash}`
        };
    }
}

/**
 * Verify a policy record
 */
async function verifyPolicy(policyId) {
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`VERIFYING POLICY: ${policyId}`, 'bold');
    log(`${'='.repeat(60)}`, 'cyan');

    const results = {
        policyId,
        dbRecord: false,
        blockchainTx: false,
        ipfsContent: false,
        contentIntegrity: false,
        errors: [],
        warnings: []
    };

    try {
        // 1. Fetch policy from database
        const policy = await Policy.findByPk(policyId);

        if (!policy) {
            logError('Policy not found in database');
            results.errors.push('Policy not found in database');
            return results;
        }

        results.dbRecord = true;
        logSuccess('Policy found in database');
        logInfo(`  Registration: ${policy.registrationNumber}`);
        logInfo(`  Vehicle: ${policy.vehicleBrand} ${policy.vehicleModel}`);
        logInfo(`  Status: ${policy.status}`);

        // 2. Verify blockchain transaction
        if (policy.blockchainTxHash) {
            logInfo(`\nVerifying blockchain transaction...`);
            logInfo(`  TX Hash: ${policy.blockchainTxHash}`);

            const txResult = await verifyTransaction(policy.blockchainTxHash);

            if (txResult.exists === true) {
                results.blockchainTx = true;
                logSuccess(`Transaction verified on blockchain`);
                logInfo(`  Block: ${txResult.blockNumber}`);
                logInfo(`  Status: ${txResult.status}`);
            } else if (txResult.exists === null) {
                logWarning(txResult.error);
                logInfo(`  Verify manually: ${txResult.explorerUrl}`);
                results.warnings.push('Could not verify on local node - check explorer');
            } else {
                logError(`Transaction not found: ${txResult.error}`);
                results.errors.push('Blockchain transaction not found');
            }
        } else {
            logWarning('No blockchain transaction hash recorded');
            results.warnings.push('No blockchain transaction hash');
        }

        // 3. Verify IPFS content
        if (policy.ipfsCid) {
            logInfo(`\nVerifying IPFS content...`);
            logInfo(`  CID: ${policy.ipfsCid}`);

            const ipfsContent = await fetchFromIPFS(policy.ipfsCid);

            if (ipfsContent) {
                results.ipfsContent = true;
                logSuccess('IPFS content retrieved successfully');

                // Verify content integrity by comparing key fields
                if (ipfsContent.registrationNumber === policy.registrationNumber) {
                    results.contentIntegrity = true;
                    logSuccess('Content integrity verified - registration number matches');
                } else {
                    logError('Content integrity mismatch!');
                    results.errors.push('IPFS content does not match database');
                }
            } else {
                logWarning('Could not retrieve IPFS content');
                results.warnings.push('IPFS content not accessible');
            }
        } else {
            logWarning('No IPFS CID recorded');
            results.warnings.push('No IPFS CID');
        }

        // 4. Check blockchain records table
        const blockchainRecords = await BlockchainRecord.findAll({
            where: { entityType: 'Policy', entityId: policyId }
        });

        if (blockchainRecords.length > 0) {
            logInfo(`\nBlockchain Records (${blockchainRecords.length} found):`);
            blockchainRecords.forEach(record => {
                logInfo(`  - Event: ${record.eventName}, Block: ${record.blockNumber}`);
            });
        }

        // Summary
        log(`\n${'─'.repeat(40)}`, 'cyan');
        log('VERIFICATION SUMMARY', 'bold');
        log(`${'─'.repeat(40)}`, 'cyan');
        logInfo(`Database Record: ${results.dbRecord ? '✅' : '❌'}`);
        logInfo(`Blockchain TX: ${results.blockchainTx ? '✅' : results.warnings.some(w => w.includes('blockchain')) ? '⚠️' : '❌'}`);
        logInfo(`IPFS Content: ${results.ipfsContent ? '✅' : results.warnings.some(w => w.includes('IPFS')) ? '⚠️' : '❌'}`);
        logInfo(`Content Integrity: ${results.contentIntegrity ? '✅' : '⚠️'}`);

        if (results.errors.length > 0) {
            log('\nErrors:', 'red');
            results.errors.forEach(e => logError(`  ${e}`));
        }
        if (results.warnings.length > 0) {
            log('\nWarnings:', 'yellow');
            results.warnings.forEach(w => logWarning(`  ${w}`));
        }

        return results;

    } catch (error) {
        logError(`Verification failed: ${error.message}`);
        results.errors.push(error.message);
        return results;
    }
}

/**
 * Verify a claim record
 */
async function verifyClaim(claimId) {
    log(`\n${'='.repeat(60)}`, 'cyan');
    log(`VERIFYING CLAIM: ${claimId}`, 'bold');
    log(`${'='.repeat(60)}`, 'cyan');

    const results = {
        claimId,
        dbRecord: false,
        blockchainTx: false,
        ipfsDescription: false,
        ipfsMlReport: false,
        photosCids: [],
        errors: [],
        warnings: []
    };

    try {
        // 1. Fetch claim from database
        const claim = await Claim.findByPk(claimId, {
            include: [{ model: Policy, as: 'policy' }]
        });

        if (!claim) {
            logError('Claim not found in database');
            results.errors.push('Claim not found in database');
            return results;
        }

        results.dbRecord = true;
        logSuccess('Claim found in database');
        logInfo(`  Status: ${claim.status}`);
        logInfo(`  Submitted: ${claim.submittedAt}`);
        if (claim.policy) {
            logInfo(`  Vehicle: ${claim.policy.vehicleBrand} ${claim.policy.vehicleModel}`);
        }

        // 2. Verify blockchain transaction
        if (claim.blockchainTxHash) {
            logInfo(`\nVerifying blockchain transaction...`);
            logInfo(`  TX Hash: ${claim.blockchainTxHash}`);

            const txResult = await verifyTransaction(claim.blockchainTxHash);

            if (txResult.exists === true) {
                results.blockchainTx = true;
                logSuccess(`Transaction verified on blockchain`);
                logInfo(`  Block: ${txResult.blockNumber}`);
                logInfo(`  Status: ${txResult.status}`);
            } else if (txResult.exists === null) {
                logWarning(txResult.error);
                logInfo(`  Verify manually: ${txResult.explorerUrl}`);
                results.warnings.push('Could not verify on local node - check explorer');
            } else {
                logError(`Transaction not found: ${txResult.error}`);
                results.errors.push('Blockchain transaction not found');
            }
        } else {
            logWarning('No blockchain transaction hash recorded');
            results.warnings.push('No blockchain transaction hash');
        }

        // 3. Verify IPFS description
        if (claim.ipfsDescriptionCid) {
            logInfo(`\nVerifying IPFS description...`);
            logInfo(`  CID: ${claim.ipfsDescriptionCid}`);

            const ipfsContent = await fetchFromIPFS(claim.ipfsDescriptionCid);

            if (ipfsContent) {
                results.ipfsDescription = true;
                logSuccess('IPFS description retrieved successfully');

                // Compare description hash
                const storedDesc = claim.description;
                const ipfsDesc = typeof ipfsContent === 'string' ? ipfsContent : ipfsContent.description;

                if (storedDesc && ipfsDesc && storedDesc.trim() === ipfsDesc.trim()) {
                    logSuccess('Description content matches');
                } else {
                    logWarning('Description content may differ (formatting)');
                }
            } else {
                logWarning('Could not retrieve IPFS description');
                results.warnings.push('IPFS description not accessible');
            }
        } else {
            logWarning('No IPFS description CID recorded');
            results.warnings.push('No IPFS description CID');
        }

        // 4. Verify ML Report on IPFS
        if (claim.mlReportCID) {
            logInfo(`\nVerifying ML Report on IPFS...`);
            logInfo(`  CID: ${claim.mlReportCID}`);

            const mlReport = await fetchFromIPFS(claim.mlReportCID);

            if (mlReport) {
                results.ipfsMlReport = true;
                logSuccess('ML Report retrieved from IPFS');
                logInfo(`  Severity in report: ${mlReport.severity}`);
                logInfo(`  Severity in DB: ${claim.mlSeverity}`);

                if (Math.abs((mlReport.severity || 0) - (claim.mlSeverity || 0)) < 0.1) {
                    logSuccess('ML severity matches');
                } else {
                    logWarning('ML severity values differ');
                }
            } else {
                logWarning('Could not retrieve ML report');
                results.warnings.push('ML report not accessible on IPFS');
            }
        }

        // 5. Verify photo CIDs
        const photos = await ClaimPhoto.findAll({ where: { claimId } });

        if (photos.length > 0) {
            logInfo(`\nVerifying ${photos.length} photo(s)...`);

            for (const photo of photos) {
                if (photo.ipfsCid) {
                    results.photosCids.push(photo.ipfsCid);
                    logInfo(`  Photo CID: ${photo.ipfsCid}`);
                }
            }

            if (results.photosCids.length > 0) {
                logSuccess(`${results.photosCids.length} photo(s) have IPFS CIDs`);
            }
        }

        // 6. Check blockchain records table
        const blockchainRecords = await BlockchainRecord.findAll({
            where: { entityType: 'Claim', entityId: claimId }
        });

        if (blockchainRecords.length > 0) {
            logInfo(`\nBlockchain Records (${blockchainRecords.length} found):`);
            blockchainRecords.forEach(record => {
                logInfo(`  - Event: ${record.eventName}, Block: ${record.blockNumber}`);
            });
        }

        // Summary
        log(`\n${'─'.repeat(40)}`, 'cyan');
        log('VERIFICATION SUMMARY', 'bold');
        log(`${'─'.repeat(40)}`, 'cyan');
        logInfo(`Database Record: ${results.dbRecord ? '✅' : '❌'}`);
        logInfo(`Blockchain TX: ${results.blockchainTx ? '✅' : results.warnings.some(w => w.includes('blockchain')) ? '⚠️' : '❌'}`);
        logInfo(`IPFS Description: ${results.ipfsDescription ? '✅' : '⚠️'}`);
        logInfo(`IPFS ML Report: ${results.ipfsMlReport ? '✅' : '⚠️'}`);
        logInfo(`Photos with CIDs: ${results.photosCids.length}`);

        if (results.errors.length > 0) {
            log('\nErrors:', 'red');
            results.errors.forEach(e => logError(`  ${e}`));
        }
        if (results.warnings.length > 0) {
            log('\nWarnings:', 'yellow');
            results.warnings.forEach(w => logWarning(`  ${w}`));
        }

        return results;

    } catch (error) {
        logError(`Verification failed: ${error.message}`);
        results.errors.push(error.message);
        return results;
    }
}

/**
 * Verify all policies
 */
async function verifyAllPolicies() {
    log('\n🔍 Verifying ALL Policies...', 'bold');

    const policies = await Policy.findAll({
        attributes: ['id', 'registrationNumber', 'blockchainTxHash', 'ipfsCid'],
        order: [['createdAt', 'DESC']]
    });

    log(`Found ${policies.length} policies\n`);

    const summary = { total: policies.length, verified: 0, warnings: 0, errors: 0 };

    for (const policy of policies) {
        const result = await verifyPolicy(policy.id);

        if (result.errors.length === 0 && result.warnings.length === 0) {
            summary.verified++;
        } else if (result.errors.length > 0) {
            summary.errors++;
        } else {
            summary.warnings++;
        }
    }

    log(`\n${'='.repeat(60)}`, 'cyan');
    log('OVERALL SUMMARY', 'bold');
    log(`${'='.repeat(60)}`, 'cyan');
    logInfo(`Total Policies: ${summary.total}`);
    logSuccess(`Fully Verified: ${summary.verified}`);
    logWarning(`With Warnings: ${summary.warnings}`);
    logError(`With Errors: ${summary.errors}`);
}

/**
 * Verify all claims
 */
async function verifyAllClaims() {
    log('\n🔍 Verifying ALL Claims...', 'bold');

    const claims = await Claim.findAll({
        attributes: ['id', 'status', 'blockchainTxHash', 'ipfsDescriptionCid'],
        order: [['submittedAt', 'DESC']]
    });

    log(`Found ${claims.length} claims\n`);

    const summary = { total: claims.length, verified: 0, warnings: 0, errors: 0 };

    for (const claim of claims) {
        const result = await verifyClaim(claim.id);

        if (result.errors.length === 0 && result.warnings.length === 0) {
            summary.verified++;
        } else if (result.errors.length > 0) {
            summary.errors++;
        } else {
            summary.warnings++;
        }
    }

    log(`\n${'='.repeat(60)}`, 'cyan');
    log('OVERALL SUMMARY', 'bold');
    log(`${'='.repeat(60)}`, 'cyan');
    logInfo(`Total Claims: ${summary.total}`);
    logSuccess(`Fully Verified: ${summary.verified}`);
    logWarning(`With Warnings: ${summary.warnings}`);
    logError(`With Errors: ${summary.errors}`);
}

/**
 * Print usage instructions
 */
function printUsage() {
    log('\n📋 VIMS Record Verification Tool', 'bold');
    log('─'.repeat(40));
    log('\nUsage:', 'cyan');
    log('  node scripts/verify-record.js policy <policyId>');
    log('  node scripts/verify-record.js claim <claimId>');
    log('  node scripts/verify-record.js --all-policies');
    log('  node scripts/verify-record.js --all-claims');
    log('\nExamples:', 'cyan');
    log('  node scripts/verify-record.js policy 550e8400-e29b-41d4-a716-446655440000');
    log('  node scripts/verify-record.js claim abc12345-e29b-41d4-a716-446655440000');
    log('  node scripts/verify-record.js --all-policies');
    log('\nThis tool verifies:', 'cyan');
    log('  • Record exists in database');
    log('  • Blockchain transaction is valid');
    log('  • IPFS content is accessible');
    log('  • Content integrity matches between DB and IPFS');
    log('');
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        printUsage();
        process.exit(0);
    }

    try {
        if (args[0] === '--all-policies') {
            await verifyAllPolicies();
        } else if (args[0] === '--all-claims') {
            await verifyAllClaims();
        } else if (args[0] === 'policy' && args[1]) {
            await verifyPolicy(args[1]);
        } else if (args[0] === 'claim' && args[1]) {
            await verifyClaim(args[1]);
        } else {
            printUsage();
            process.exit(1);
        }

        process.exit(0);
    } catch (error) {
        logError(`Fatal error: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

main();
