// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title InsuranceLedger
 * @dev Smart contract for immutable insurance policy and claim records
 */
contract InsuranceLedger {
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
        string[] ipfsCids;
        ClaimStatus status;
        uint256 submittedAt;
        uint256 updatedAt;
    }

    // State variables
    mapping(string => Policy) public policies;
    mapping(string => Claim) public claims;
    mapping(string => bool) public policyExists;
    mapping(string => bool) public claimExists;

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
        string[] ipfsCids,
        uint256 timestamp
    );

    event ClaimStatusUpdated(
        string indexed claimId,
        ClaimStatus oldStatus,
        ClaimStatus newStatus,
        uint256 timestamp
    );

    // Modifiers
    modifier onlyValidPolicy(string memory policyId) {
        require(policyExists[policyId], "Policy does not exist");
        _;
    }

    modifier onlyValidClaim(string memory claimId) {
        require(claimExists[claimId], "Claim does not exist");
        _;
    }

    /**
     * @dev Issue a new insurance policy
     * @param policyId Unique policy identifier
     * @param userId User identifier
     * @param premium Policy premium amount
     * @param startDate Policy start date (Unix timestamp)
     * @param endDate Policy end date (Unix timestamp)
     */
    function issuePolicy(
        string memory policyId,
        string memory userId,
        uint256 premium,
        uint256 startDate,
        uint256 endDate
    ) public {
        require(!policyExists[policyId], "Policy already exists");
        require(startDate < endDate, "Invalid date range");
        require(premium > 0, "Premium must be greater than 0");

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
     * @dev Submit a new insurance claim
     * @param claimId Unique claim identifier
     * @param policyId Associated policy identifier
     * @param userId User identifier
     * @param description Claim description
     * @param ipfsCids Array of IPFS CIDs for claim photos
     */
    function submitClaim(
        string memory claimId,
        string memory policyId,
        string memory userId,
        string memory description,
        string[] memory ipfsCids
    ) public onlyValidPolicy(policyId) {
        require(!claimExists[claimId], "Claim already exists");
        require(bytes(description).length > 0, "Description cannot be empty");

        Claim memory newClaim = Claim({
            claimId: claimId,
            policyId: policyId,
            userId: userId,
            description: description,
            ipfsCids: ipfsCids,
            status: ClaimStatus.Submitted,
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
            ipfsCids,
            block.timestamp
        );
    }

    /**
     * @dev Update claim status
     * @param claimId Claim identifier
     * @param newStatus New claim status
     */
    function updateClaimStatus(
        string memory claimId,
        ClaimStatus newStatus
    ) public onlyValidClaim(claimId) {
        Claim storage claim = claims[claimId];
        ClaimStatus oldStatus = claim.status;

        require(
            newStatus != ClaimStatus.Submitted || oldStatus == ClaimStatus.Submitted,
            "Invalid status transition"
        );

        claim.status = newStatus;
        claim.updatedAt = block.timestamp;

        emit ClaimStatusUpdated(claimId, oldStatus, newStatus, block.timestamp);
    }

    /**
     * @dev Get policy details
     * @param policyId Policy identifier
     * @return Policy struct
     */
    function getPolicy(
        string memory policyId
    ) public view onlyValidPolicy(policyId) returns (Policy memory) {
        return policies[policyId];
    }

    /**
     * @dev Get claim details
     * @param claimId Claim identifier
     * @return Claim struct
     */
    function getClaim(
        string memory claimId
    ) public view onlyValidClaim(claimId) returns (Claim memory) {
        return claims[claimId];
    }

    /**
     * @dev Get claim IPFS CIDs
     * @param claimId Claim identifier
     * @return Array of IPFS CIDs
     */
    function getClaimIPFSCids(
        string memory claimId
    ) public view onlyValidClaim(claimId) returns (string[] memory) {
        return claims[claimId].ipfsCids;
    }
}

