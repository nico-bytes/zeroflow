export const USDC_ADDRESS = '0x7d931159D74730FBd41E62bD367b68944e6a3439' as `0x${string}`;
export const ZAMA_ADDRESS = '0xF7b5Eeb9052283be395C96D5D3Aa4a87946aaf0E' as `0x${string}`;
export const SWAP_ADDRESS = '0xf9e76213A605cCa90bbc15d2F6353F88975406c7' as `0x${string}`;

export const USDC_ABI = [
  {
    type: 'function',
    name: 'confidentialBalanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint64' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setOperator',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'until', type: 'uint48' },
    ],
    outputs: [],
  },
] as const;

export const ZAMA_ABI = [
  {
    type: 'function',
    name: 'confidentialBalanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint64' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setOperator',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'until', type: 'uint48' },
    ],
    outputs: [],
  },
] as const;

export const SWAP_ABI = [
  {
    type: 'function',
    name: 'addLiquidity',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'usdcAmount', type: 'uint64' },
      { name: 'zamaAmount', type: 'uint64' },
    ],
    outputs: [{ name: 'liquidity', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'removeLiquidity',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'liquidity', type: 'uint256' }],
    outputs: [
      { name: 'usdcAmount', type: 'uint64' },
      { name: 'zamaAmount', type: 'uint64' },
    ],
  },
  {
    type: 'function',
    name: 'swapExactUsdcForZama',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'usdcIn', type: 'uint64' },
      { name: 'minZamaOut', type: 'uint64' },
    ],
    outputs: [{ name: 'zamaOut', type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'swapExactZamaForUsdc',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'zamaIn', type: 'uint64' },
      { name: 'minUsdcOut', type: 'uint64' },
    ],
    outputs: [{ name: 'usdcOut', type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'getReserves',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'usdcReserve', type: 'uint64' },
      { name: 'zamaReserve', type: 'uint64' },
    ],
  },
  {
    type: 'function',
    name: 'getTokens',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'usdcToken', type: 'address' },
      { name: 'zamaToken', type: 'address' },
    ],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
