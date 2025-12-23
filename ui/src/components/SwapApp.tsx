import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { Contract, formatUnits, parseUnits } from 'ethers';

import { Header } from './Header';
import { publicClient } from '../config/viem';
import {
  SWAP_ABI,
  SWAP_ADDRESS,
  USDC_ABI,
  USDC_ADDRESS,
  ZAMA_ABI,
  ZAMA_ADDRESS,
} from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import '../styles/SwapApp.css';

type StatusTone = 'idle' | 'info' | 'success' | 'error';

export function SwapApp() {
  const { address } = useAccount();
  const signer = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const addressesReady = useMemo(
    () => USDC_ADDRESS !== zeroAddress && ZAMA_ADDRESS !== zeroAddress && SWAP_ADDRESS !== zeroAddress,
    [],
  );

  const [statusTone, setStatusTone] = useState<StatusTone>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Ready.');

  const [usdcEncrypted, setUsdcEncrypted] = useState<string>('0x');
  const [zamaEncrypted, setZamaEncrypted] = useState<string>('0x');
  const [usdcDecrypted, setUsdcDecrypted] = useState<string | null>(null);
  const [zamaDecrypted, setZamaDecrypted] = useState<string | null>(null);

  const [reserveUsdc, setReserveUsdc] = useState<bigint>(0n);
  const [reserveZama, setReserveZama] = useState<bigint>(0n);
  const [lpSupply, setLpSupply] = useState<bigint>(0n);
  const [lpBalance, setLpBalance] = useState<bigint>(0n);

  const [mintUsdcInput, setMintUsdcInput] = useState('');
  const [mintZamaInput, setMintZamaInput] = useState('');
  const [liquidityUsdcInput, setLiquidityUsdcInput] = useState('');
  const [liquidityZamaInput, setLiquidityZamaInput] = useState('');
  const [removeLiquidityInput, setRemoveLiquidityInput] = useState('');
  const [swapAmountIn, setSwapAmountIn] = useState('');
  const [swapMinOut, setSwapMinOut] = useState('');
  const [swapDirection, setSwapDirection] = useState<'usdc-to-zama' | 'zama-to-usdc'>('usdc-to-zama');

  const formattedReserveUsdc = useMemo(() => formatUnits(reserveUsdc, 6), [reserveUsdc]);
  const formattedReserveZama = useMemo(() => formatUnits(reserveZama, 6), [reserveZama]);
  const formattedLpSupply = useMemo(() => formatUnits(lpSupply, 18), [lpSupply]);
  const formattedLpBalance = useMemo(() => formatUnits(lpBalance, 18), [lpBalance]);

  const updateStatus = useCallback((tone: StatusTone, message: string) => {
    setStatusTone(tone);
    setStatusMessage(message);
  }, []);

  const refreshOnchainData = useCallback(async () => {
    if (!address || !addressesReady) {
      setUsdcEncrypted('0x');
      setZamaEncrypted('0x');
      setReserveUsdc(0n);
      setReserveZama(0n);
      setLpBalance(0n);
      setLpSupply(0n);
      return;
    }

    try {
      const [usdcHandle, zamaHandle, reserves, totalSupply, balance] = await Promise.all([
        publicClient.readContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'confidentialBalanceOf',
          args: [address],
        }),
        publicClient.readContract({
          address: ZAMA_ADDRESS,
          abi: ZAMA_ABI,
          functionName: 'confidentialBalanceOf',
          args: [address],
        }),
        publicClient.readContract({
          address: SWAP_ADDRESS,
          abi: SWAP_ABI,
          functionName: 'getReserves',
        }),
        publicClient.readContract({
          address: SWAP_ADDRESS,
          abi: SWAP_ABI,
          functionName: 'totalSupply',
        }),
        publicClient.readContract({
          address: SWAP_ADDRESS,
          abi: SWAP_ABI,
          functionName: 'balanceOf',
          args: [address],
        }),
      ]);

      setUsdcEncrypted(usdcHandle as string);
      setZamaEncrypted(zamaHandle as string);
      setReserveUsdc((reserves as readonly [bigint, bigint])[0]);
      setReserveZama((reserves as readonly [bigint, bigint])[1]);
      setLpSupply(totalSupply as bigint);
      setLpBalance(balance as bigint);
    } catch (error) {
      console.error('Failed to refresh onchain data:', error);
    }
  }, [address]);

  useEffect(() => {
    refreshOnchainData();
    const interval = setInterval(refreshOnchainData, 15000);
    return () => clearInterval(interval);
  }, [refreshOnchainData]);

  useEffect(() => {
    if (!addressesReady) {
      updateStatus('error', 'Contract addresses are not set in contracts config.');
    }
  }, [addressesReady, updateStatus]);

  useEffect(() => {
    setUsdcDecrypted(null);
    setZamaDecrypted(null);
  }, [address]);

  const decryptBalance = async (handle: string, tokenName: 'USDC' | 'ZAMA') => {
    if (!addressesReady) {
      updateStatus('error', 'Set contract addresses before decrypting.');
      return;
    }
    if (!instance || !address || !handle || !signer) {
      updateStatus('error', 'Missing wallet or relayer connection.');
      return;
    }

    if (handle === '0x' || handle === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      updateStatus('info', `${tokenName} balance is empty.`);
      return;
    }

    updateStatus('info', `Decrypting ${tokenName} balance...`);

    try {
      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        {
          handle,
          contractAddress: tokenName === 'USDC' ? USDC_ADDRESS : ZAMA_ADDRESS,
        },
      ];

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [tokenName === 'USDC' ? USDC_ADDRESS : ZAMA_ADDRESS];

      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const resolvedSigner = await signer;
      if (!resolvedSigner) {
        throw new Error('Signer not available');
      }

      const signature = await resolvedSigner.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const decryptedValue = result[handle] ?? '0';
      if (tokenName === 'USDC') {
        setUsdcDecrypted(decryptedValue);
      } else {
        setZamaDecrypted(decryptedValue);
      }
      updateStatus('success', `${tokenName} balance decrypted.`);
    } catch (error) {
      console.error('Error decrypting balance:', error);
      updateStatus('error', 'Decryption failed. Try again.');
    }
  };

  const getWriteContracts = async () => {
    if (!signer || !address || !addressesReady) {
      throw new Error('Wallet not connected');
    }
    const resolvedSigner = await signer;
    if (!resolvedSigner) {
      throw new Error('Signer not ready');
    }

    return {
      usdc: new Contract(USDC_ADDRESS, USDC_ABI, resolvedSigner),
      zama: new Contract(ZAMA_ADDRESS, ZAMA_ABI, resolvedSigner),
      swap: new Contract(SWAP_ADDRESS, SWAP_ABI, resolvedSigner),
    };
  };

  const handleMint = async (token: 'USDC' | 'ZAMA') => {
    const amount = token === 'USDC' ? mintUsdcInput : mintZamaInput;
    if (!amount || !address || !addressesReady) {
      updateStatus('error', 'Enter an amount to mint.');
      return;
    }

    try {
      const parsed = parseUnits(amount, 6);
      const { usdc, zama } = await getWriteContracts();
      updateStatus('info', `Minting ${token}...`);
      const tx = token === 'USDC' ? await usdc.mint(address, parsed) : await zama.mint(address, parsed);
      await tx.wait();
      updateStatus('success', `${token} minted.`);
      await refreshOnchainData();
    } catch (error) {
      console.error('Mint failed:', error);
      updateStatus('error', 'Mint failed.');
    }
  };

  const handleEnablePool = async () => {
    if (!addressesReady) {
      updateStatus('error', 'Set contract addresses before enabling the pool.');
      return;
    }
    try {
      const { usdc, zama } = await getWriteContracts();
      const until = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
      updateStatus('info', 'Enabling pool operator...');
      const tx1 = await usdc.setOperator(SWAP_ADDRESS, until);
      await tx1.wait();
      const tx2 = await zama.setOperator(SWAP_ADDRESS, until);
      await tx2.wait();
      updateStatus('success', 'Pool operator enabled.');
    } catch (error) {
      console.error('Operator set failed:', error);
      updateStatus('error', 'Failed to enable pool.');
    }
  };

  const handleAddLiquidity = async () => {
    if (!addressesReady) {
      updateStatus('error', 'Set contract addresses before adding liquidity.');
      return;
    }
    if (!liquidityUsdcInput || !liquidityZamaInput) {
      updateStatus('error', 'Enter both amounts for liquidity.');
      return;
    }

    try {
      const parsedUsdc = parseUnits(liquidityUsdcInput, 6);
      const parsedZama = parseUnits(liquidityZamaInput, 6);
      const { swap } = await getWriteContracts();
      updateStatus('info', 'Adding liquidity...');
      const tx = await swap.addLiquidity(parsedUsdc, parsedZama);
      await tx.wait();
      updateStatus('success', 'Liquidity added.');
      await refreshOnchainData();
    } catch (error) {
      console.error('Add liquidity failed:', error);
      updateStatus('error', 'Add liquidity failed.');
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!addressesReady) {
      updateStatus('error', 'Set contract addresses before removing liquidity.');
      return;
    }
    if (!removeLiquidityInput) {
      updateStatus('error', 'Enter LP amount to remove.');
      return;
    }

    try {
      const parsedLiquidity = parseUnits(removeLiquidityInput, 18);
      const { swap } = await getWriteContracts();
      updateStatus('info', 'Removing liquidity...');
      const tx = await swap.removeLiquidity(parsedLiquidity);
      await tx.wait();
      updateStatus('success', 'Liquidity removed.');
      await refreshOnchainData();
    } catch (error) {
      console.error('Remove liquidity failed:', error);
      updateStatus('error', 'Remove liquidity failed.');
    }
  };

  const handleSwap = async () => {
    if (!addressesReady) {
      updateStatus('error', 'Set contract addresses before swapping.');
      return;
    }
    if (!swapAmountIn || !swapMinOut) {
      updateStatus('error', 'Enter swap amount and minimum output.');
      return;
    }

    try {
      const parsedIn = parseUnits(swapAmountIn, 6);
      const parsedMinOut = parseUnits(swapMinOut, 6);
      const { swap } = await getWriteContracts();
      updateStatus('info', 'Submitting swap...');
      const tx =
        swapDirection === 'usdc-to-zama'
          ? await swap.swapExactUsdcForZama(parsedIn, parsedMinOut)
          : await swap.swapExactZamaForUsdc(parsedIn, parsedMinOut);
      await tx.wait();
      updateStatus('success', 'Swap completed.');
      await refreshOnchainData();
    } catch (error) {
      console.error('Swap failed:', error);
      updateStatus('error', 'Swap failed.');
    }
  };

  return (
    <div className="swap-app">
      <Header />
      <main className="swap-main">
        <section className="hero">
          <div className="hero-card">
            <p className="eyebrow">Sepolia • Confidential Pool</p>
            <h2>Swap cUSDC and cZama without exposing balances.</h2>
            <p className="hero-copy">
              Manage liquidity with the initial 1 cZama = 2 cUSDC price ratio. Decrypt your balances on demand
              using the relayer.
            </p>
            <div className="hero-actions">
              <button className="ghost-button" onClick={refreshOnchainData}>
                Refresh Data
              </button>
              <button className="primary-button" onClick={handleEnablePool} disabled={!address || !addressesReady}>
                Enable Pool Operator
              </button>
            </div>
          </div>
          <div className="hero-panel">
            <div className="hero-panel-content">
              <div>
                <h3>Pool Snapshot</h3>
                <p className="muted">Live reserves and LP totals from the pool contract.</p>
              </div>
              <div className="stat-grid">
                <div className="stat-card">
                  <span>cUSDC Reserve</span>
                  <strong>{formattedReserveUsdc}</strong>
                </div>
                <div className="stat-card">
                  <span>cZama Reserve</span>
                  <strong>{formattedReserveZama}</strong>
                </div>
                <div className="stat-card">
                  <span>LP Supply</span>
                  <strong>{formattedLpSupply}</strong>
                </div>
                <div className="stat-card">
                  <span>Your LP</span>
                  <strong>{formattedLpBalance}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid-section">
          <div className="card">
            <div className="card-header">
              <h3>Balances</h3>
              <p className="muted">Encrypted by default. Decrypt only when needed.</p>
            </div>
            <div className="balance-list">
              <div className="balance-row">
                <div>
                  <h4>cUSDC</h4>
                  <p className="mono">{usdcEncrypted.slice(0, 16)}...</p>
                  <p className="muted">{usdcDecrypted ? `${formatUnits(BigInt(usdcDecrypted), 6)} decrypted` : 'Encrypted'}</p>
                </div>
                <button
                  className="ghost-button"
                  onClick={() => decryptBalance(usdcEncrypted, 'USDC')}
                  disabled={!address || !addressesReady}
                >
                  Decrypt
                </button>
              </div>
              <div className="balance-row">
                <div>
                  <h4>cZama</h4>
                  <p className="mono">{zamaEncrypted.slice(0, 16)}...</p>
                  <p className="muted">{zamaDecrypted ? `${formatUnits(BigInt(zamaDecrypted), 6)} decrypted` : 'Encrypted'}</p>
                </div>
                <button
                  className="ghost-button"
                  onClick={() => decryptBalance(zamaEncrypted, 'ZAMA')}
                  disabled={!address || !addressesReady}
                >
                  Decrypt
                </button>
              </div>
            </div>
            <div className="balance-warning">
              {zamaLoading ? 'Connecting to relayer...' : zamaError ? zamaError : 'Relayer ready.'}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Mint Test Tokens</h3>
              <p className="muted">Mint directly to your wallet for testing on Sepolia.</p>
            </div>
            <div className="form-grid">
              <div>
                <label>cUSDC Amount</label>
                <input
                  value={mintUsdcInput}
                  onChange={(event) => setMintUsdcInput(event.target.value)}
                  placeholder="1000.00"
                />
                <button
                  className="primary-button full"
                  onClick={() => handleMint('USDC')}
                  disabled={!address || !addressesReady}
                >
                  Mint cUSDC
                </button>
              </div>
              <div>
                <label>cZama Amount</label>
                <input
                  value={mintZamaInput}
                  onChange={(event) => setMintZamaInput(event.target.value)}
                  placeholder="500.00"
                />
                <button
                  className="primary-button full"
                  onClick={() => handleMint('ZAMA')}
                  disabled={!address || !addressesReady}
                >
                  Mint cZama
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Add Liquidity</h3>
              <p className="muted">Initial ratio must be 1 cZama = 2 cUSDC.</p>
            </div>
            <div className="form-grid">
              <div>
                <label>cUSDC Amount</label>
                <input
                  value={liquidityUsdcInput}
                  onChange={(event) => setLiquidityUsdcInput(event.target.value)}
                  placeholder="2000.00"
                />
              </div>
              <div>
                <label>cZama Amount</label>
                <input
                  value={liquidityZamaInput}
                  onChange={(event) => setLiquidityZamaInput(event.target.value)}
                  placeholder="1000.00"
                />
              </div>
            </div>
            <button className="primary-button full" onClick={handleAddLiquidity} disabled={!address || !addressesReady}>
              Add Liquidity
            </button>
            <div className="divider" />
            <div>
              <label>Remove LP Tokens</label>
              <input
                value={removeLiquidityInput}
                onChange={(event) => setRemoveLiquidityInput(event.target.value)}
                placeholder="1.0"
              />
              <button
                className="ghost-button full"
                onClick={handleRemoveLiquidity}
                disabled={!address || !addressesReady}
              >
                Remove Liquidity
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Swap</h3>
              <p className="muted">0.3% fee, Uniswap V2 style.</p>
            </div>
            <div className="swap-toggle">
              <button
                className={swapDirection === 'usdc-to-zama' ? 'active' : ''}
                onClick={() => setSwapDirection('usdc-to-zama')}
              >
                cUSDC → cZama
              </button>
              <button
                className={swapDirection === 'zama-to-usdc' ? 'active' : ''}
                onClick={() => setSwapDirection('zama-to-usdc')}
              >
                cZama → cUSDC
              </button>
            </div>
            <div className="form-grid">
              <div>
                <label>Amount In</label>
                <input
                  value={swapAmountIn}
                  onChange={(event) => setSwapAmountIn(event.target.value)}
                  placeholder="100.00"
                />
              </div>
              <div>
                <label>Minimum Out</label>
                <input
                  value={swapMinOut}
                  onChange={(event) => setSwapMinOut(event.target.value)}
                  placeholder="48.00"
                />
              </div>
            </div>
            <button className="primary-button full" onClick={handleSwap} disabled={!address || !addressesReady}>
              Execute Swap
            </button>
          </div>
        </section>

        <section className={`status-bar ${statusTone}`}>
          <span>Status</span>
          <p>{statusMessage}</p>
        </section>
      </main>
    </div>
  );
}
