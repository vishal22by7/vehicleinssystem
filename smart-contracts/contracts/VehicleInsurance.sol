// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VehicleInsurance
 * @dev Enhanced smart contract for hybrid blockchain insurance system
 * Includes ML analysis, IPFS storage, and automated claim evaluation
 */
contract VehicleInsurance {
    // Enums
    enum ClaimStatus {
        Submitted,
        InReview,
        Approved,
        Rejected
    }

    // Structs
    struct Policy {
        string policyId;
        string userId;
        uint256 premium;
        uint256 startDate;
        uint256 endDate;
        uint256 issuedAt;
    }

    struct Claim {
        string claimId;
        string policyId;
        string userId;
        string description;
        string[] evidenceCids;      // IPFS CIDs for claim photos
        string mlReportCID;          // IPFS CID for ML analysis report
        uint256 severity;            // ML severity score (0-100)
        ClaimStatus status;
        bool verified;               // Private verification result
        uint256 payoutAmount;        // Approved payout amount
        uint256 submittedAt;
        uint256 updatedAt;
    }

    // State variables
    mapping(string => Policy) public policies;
    mapping(string => Claim) public claims;
    mapping(string => bool) public policyExists;
    mapping(string => bool) public claimExists;

    // Oracle address (can be set by deployer)
    address public oracleAddress;
    address public owner;

    // Events
    event PolicyIssued(
        string indexed policyId,
        string indexed userId,
        uint256 premium,
        uint256 startDate,
        uint256 endDate,
        uint256 timestamp
    );

    event ClaimSubmitted(
        string indexed claimId,
        string indexed policyId,
        string indexed userId,
        string description,
        string[] evidenceCids,
        string mlReportCID,
        uint256 severity,
        uint256 timestamp
    );

    event ClaimEvaluated(
        string indexed claimId,
        ClaimStatus status,
        bool verified,
        uint256 payoutAmount,
        uint256 timestamp
    );

    event ClaimStatusUpdated(
        string indexed claimId,
        ClaimStatus oldStatus,
        ClaimStatus newStatus,
        uint256 timestamp
    );

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracleAddress || msg.sender == owner, "Only oracle can call this function");
        _;
    }

    modifier onlyValidPolicy(string memory policyId) {
        require(policyExists[policyId], "Policy does not exist");
        _;
    }

    modifier onlyValidClaim(string memory claimId) {
        require(claimExists[claimId], "Claim does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
        oracleAddress = msg.sender; // Can be updated later
    }

    /**
     * @dev Set oracle address
     */
    function setOracleAddress(address _oracleAddress) public onlyOwner {
        oracleAddress = _oracleAddress;
    }

    /**
     * @dev Issue a new insurance policy
     */
    function issuePolicy(
        string memory policyId,
        string memory userId,
        uint256 premium,
        uint256 startDate,
        uint256 endDate
    ) public payable {
        require(!policyExists[policyId], "Policy already exists");
        require(startDate < endDate, "Invalid date range");
        require(premium > 0, "Premium must be greater than 0");
        require(msg.value == premium, "Premium payment mismatch");

        Policy memory newPolicy = Policy({
            policyId: policyId,
            userId: userId,
            premium: premium,
            startDate: startDate,
            endDate: endDate,
            issuedAt: block.timestamp
        });

        policies[policyId] = newPolicy;
        policyExists[policyId] = true;

        emit PolicyIssued(
            policyId,
            userId,
            premium,
            startDate,
            endDate,
            block.timestamp
        );
    }

    /**
     * @dev Submit a new insurance claim with ML analysis
     * @param claimId Unique claim identifier
     * @param policyId Associated policy identifier
     * @param userId User identifier
     * @param description Claim description
     * @param evidenceCids Array of IPFS CIDs for claim photos
     * @param mlReportCID IPFS CID for ML analysis report
     * @param severity ML severity score (0-100)
     */
    function submitClaim(
        string memory claimId,
        string memory policyId,
        string memory userId,
        string memory description,
        string[] memory evidenceCids,
        string memory mlReportCID,
        uint256 severity
    ) public onlyValidPolicy(policyId) {
        require(!claimExists[claimId], "Claim already exists");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(severity <= 100, "Severity must be between 0 and 100");

        Claim memory newClaim = Claim({
            claimId: claimId,
            policyId: policyId,
            userId: userId,
            description: description,
            evidenceCids: evidenceCids,
            mlReportCID: mlReportCID,
            severity: severity,
            status: ClaimStatus.Submitted,
            verified: false,
            payoutAmount: 0,
            submittedAt: block.timestamp,
            updatedAt: block.timestamp
        });

        claims[claimId] = newClaim;
        claimExists[claimId] = true;

        emit ClaimSubmitted(
            claimId,
            policyId,
            userId,
            description,
            evidenceCids,
            mlReportCID,
            severity,
            block.timestamp
        );
    }

    /**
     * @dev Evaluate claim (called by Oracle)
     * @param claimId Claim identifier
     * @param approved Whether claim is approved
     * @param verified Whether private verification passed
     * @param payoutAmount Payout amount in wei
     */
    function evaluateClaim(
        string memory claimId,
        bool approved,
        bool verified,
        uint256 payoutAmount
    ) public onlyOracle onlyValidClaim(claimId) {
        Claim storage claim = claims[claimId];
        ClaimStatus oldStatus = claim.status;
        
        require(oldStatus == ClaimStatus.Submitted || oldStatus == ClaimStatus.InReview, 
                "Claim already evaluated");

        claim.verified = verified;
        claim.payoutAmount = payoutAmount;
        claim.status = approved ? ClaimStatus.Approved : ClaimStatus.Rejected;
        claim.updatedAt = block.timestamp;

        emit ClaimEvaluated(
            claimId,
            claim.status,
            verified,
            payoutAmount,
            block.timestamp
        );

        emit ClaimStatusUpdated(claimId, oldStatus, claim.status, block.timestamp);
    }

    /**
     * @dev Update claim status manually (for admin)
     */
    function updateClaimStatus(
        string memory claimId,
        ClaimStatus newStatus
    ) public onlyOracle onlyValidClaim(claimId) {
        Claim storage claim = claims[claimId];
        ClaimStatus oldStatus = claim.status;

        claim.status = newStatus;
        claim.updatedAt = block.timestamp;

        emit ClaimStatusUpdated(claimId, oldStatus, newStatus, block.timestamp);
    }

    /**
     * @dev Get policy details
     */
    function getPolicy(
        string memory policyId
    ) public view onlyValidPolicy(policyId) returns (Policy memory) {
        return policies[policyId];
    }

    /**
     * @dev Get claim details
     */
    function getClaim(
        string memory claimId
    ) public view onlyValidClaim(claimId) returns (Claim memory) {
        return claims[claimId];
    }

    /**
     * @dev Get claim evidence CIDs
     */
    function getClaimEvidenceCids(
        string memory claimId
    ) public view onlyValidClaim(claimId) returns (string[] memory) {
        return claims[claimId].evidenceCids;
    }

    /**
     * @dev Get claim ML report CID
     */
    function getClaimMLReportCID(
        string memory claimId
    ) public view onlyValidClaim(claimId) returns (string memory) {
        return claims[claimId].mlReportCID;
    }
}

