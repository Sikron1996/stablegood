export const ABI = [
  "function totalMinted() view returns (uint256)",
  "function mintEnabled() view returns (bool)",
  "function mintedByWallet(address) view returns (uint256)",
  "function mintCost(address,uint256) view returns (uint256)",
  "function mint(uint256) payable",
  "function tokenURI(uint256) view returns (string)",
  "function ownerOf(uint256) view returns (address)",
  "function balanceOf(address) view returns (uint256)",
  "event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)"
];
