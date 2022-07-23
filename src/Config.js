const Config = {
  rpc : "https://rpc.ankr.com/bsc_testnet_chapel",
  Treasury: {
    address: "0xAB68495c9dDc4bE872f6e93ee2cd94183827F117"
  },
  BUSD: {
    address: "0x9e3F47234e72e222348552e028ceEB8f4C428d26",
    abi: [
      "event Transfer(address indexed from, address indexed to, uint256 value)"
    ]
  },
  BondDepository: {
    address: "0x66FCf5592EEa3e0cD27F53af6C8F0D7B82d85d20",
    abi: [
      "function markets(uint256) view returns (uint256 capacity, address quoteToken, bool capacityInQuote, uint64 totalDebt, uint64 maxPayout, uint64 sold, uint256 purchased)",
      "event Bond(uint256 indexed id, uint256 amount, uint256 price, uint256 noteId, address indexed buyer, address indexed referral, uint256 commission, uint256 toBuyer, uint256 toDaoCommunity, uint256 toDaoInvestment)"
    ]
  },
  QuickBond: {
    address: "0xa95Ee62930840737473FD9f3D867A2758819c688",
    abi: [
      "event QuickBond(address indexed sender, address indexed token, uint256 tokensRec, address referral)",
    ]
  }
}

export default Config;