// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IERC5192.sol";

contract LifeBridgePledge is ERC721, IERC5192, Ownable {
    uint256 private _nextTokenId = 1;

    // Simplified struct: Fast, readable, perfect for a hackathon demo
    struct Pledge {
        string userId;     // Matches the MongoDB User ID
        string pledgeType; // "organ", "blood", "plasma"
        bool isActive;
    }

    mapping(uint256 => Pledge) public pledges;
    mapping(string => uint256) public userToTokenId;

    // The Server Wallet (deployer) will be the Owner
    constructor() ERC721("LifeBridge Soulbound", "LBP") Ownable(msg.sender) {}

    /// @notice Mints a Soulbound Pledge. Called by your Next.js server.
    function mintPledge(string memory userId, string memory pledgeType) external onlyOwner returns (uint256) {
        require(userToTokenId[userId] == 0, "Error: User already has a pledge.");

        uint256 tokenId = _nextTokenId++;
        
        // Mint to the server wallet
        _mint(msg.sender, tokenId); 

        pledges[tokenId] = Pledge(userId, pledgeType, true);
        userToTokenId[userId] = tokenId;

        emit Locked(tokenId); // ERC5192 Requirement
        return tokenId;
    }

    /// @notice Revokes a pledge. Made instant for the Hackathon Demo.
    function revokePledge(string memory userId) external onlyOwner {
        uint256 tokenId = userToTokenId[userId];
        require(tokenId != 0, "Error: No pledge found.");
        require(pledges[tokenId].isActive, "Error: Pledge already revoked.");

        pledges[tokenId].isActive = false;
    }

    /// @notice The AI Matching Engine calls this to verify consent.
    function isPledgeActive(string memory userId) external view returns (bool) {
        uint256 tokenId = userToTokenId[userId];
        if (tokenId == 0) return false;
        return pledges[tokenId].isActive;
    }

    /// @notice ERC-5192: All tokens are permanently locked.
    function locked(uint256 tokenId) external view override returns (bool) {
        ownerOf(tokenId); // Reverts if token doesn't exist
        return true;
    }

    /// @dev SOULBOUND MAGIC: Block all transfers to make it un-tamperable.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting and burning, strictly block transfers
        require(from == address(0) || to == address(0), "Soulbound: Token cannot be transferred.");
        
        return super._update(to, tokenId, auth);
    }
}