// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";

/// @title ZamaSwap
/// @notice Minimal Uniswap V2-style pool for cUSDC and cZama with a 0.3% fee.
contract ZamaSwap is ERC20, ZamaEthereumConfig {
    IERC7984 public immutable usdc;
    IERC7984 public immutable zama;

    uint64 private _reserveUsdc;
    uint64 private _reserveZama;

    uint256 private constant FEE_NUMERATOR = 997;
    uint256 private constant FEE_DENOMINATOR = 1000;

    event LiquidityAdded(address indexed provider, uint64 usdcAmount, uint64 zamaAmount, uint256 liquidity);
    event LiquidityRemoved(address indexed provider, uint64 usdcAmount, uint64 zamaAmount, uint256 liquidity);
    event Swap(address indexed sender, address indexed tokenIn, uint64 amountIn, address indexed tokenOut, uint64 amountOut);

    error InvalidTokenAddress();
    error InvalidAmount();
    error InsufficientLiquidity();
    error InvalidInitialPrice();
    error InvalidRatio();
    error SlippageExceeded();
    error ReserveOverflow();

    constructor(address usdcAddress, address zamaAddress) ERC20("ZamaSwap LP", "ZSLP") {
        if (usdcAddress == address(0) || zamaAddress == address(0) || usdcAddress == zamaAddress) {
            revert InvalidTokenAddress();
        }
        usdc = IERC7984(usdcAddress);
        zama = IERC7984(zamaAddress);
    }

    function getTokens() external view returns (address usdcToken, address zamaToken) {
        return (address(usdc), address(zama));
    }

    function getReserves() external view returns (uint64 usdcReserve, uint64 zamaReserve) {
        return (_reserveUsdc, _reserveZama);
    }

    function addLiquidity(uint64 usdcAmount, uint64 zamaAmount) external returns (uint256 liquidity) {
        if (usdcAmount == 0 || zamaAmount == 0) {
            revert InvalidAmount();
        }

        uint256 supply = totalSupply();
        if (supply == 0) {
            if (uint256(usdcAmount) != uint256(zamaAmount) * 2) {
                revert InvalidInitialPrice();
            }
        } else {
            if (uint256(usdcAmount) * _reserveZama != uint256(zamaAmount) * _reserveUsdc) {
                revert InvalidRatio();
            }
        }

        euint64 usdcEncrypted = FHE.asEuint64(usdcAmount);
        euint64 zamaEncrypted = FHE.asEuint64(zamaAmount);
        usdc.confidentialTransferFrom(msg.sender, address(this), usdcEncrypted);
        zama.confidentialTransferFrom(msg.sender, address(this), zamaEncrypted);

        if (supply == 0) {
            liquidity = _sqrt(uint256(usdcAmount) * uint256(zamaAmount));
        } else {
            uint256 liquidityUsdc = (uint256(usdcAmount) * supply) / _reserveUsdc;
            uint256 liquidityZama = (uint256(zamaAmount) * supply) / _reserveZama;
            liquidity = liquidityUsdc < liquidityZama ? liquidityUsdc : liquidityZama;
        }

        if (liquidity == 0) {
            revert InsufficientLiquidity();
        }

        _mint(msg.sender, liquidity);
        _setReserves(uint256(_reserveUsdc) + usdcAmount, uint256(_reserveZama) + zamaAmount);

        emit LiquidityAdded(msg.sender, usdcAmount, zamaAmount, liquidity);
    }

    function removeLiquidity(uint256 liquidity) external returns (uint64 usdcAmount, uint64 zamaAmount) {
        if (liquidity == 0) {
            revert InvalidAmount();
        }
        uint256 supply = totalSupply();
        if (liquidity > balanceOf(msg.sender)) {
            revert InsufficientLiquidity();
        }

        usdcAmount = uint64((uint256(_reserveUsdc) * liquidity) / supply);
        zamaAmount = uint64((uint256(_reserveZama) * liquidity) / supply);

        if (usdcAmount == 0 || zamaAmount == 0) {
            revert InsufficientLiquidity();
        }

        _burn(msg.sender, liquidity);
        _setReserves(uint256(_reserveUsdc) - usdcAmount, uint256(_reserveZama) - zamaAmount);

        usdc.confidentialTransfer(msg.sender, FHE.asEuint64(usdcAmount));
        zama.confidentialTransfer(msg.sender, FHE.asEuint64(zamaAmount));

        emit LiquidityRemoved(msg.sender, usdcAmount, zamaAmount, liquidity);
    }

    function swapExactUsdcForZama(uint64 usdcIn, uint64 minZamaOut) external returns (uint64 zamaOut) {
        if (usdcIn == 0) {
            revert InvalidAmount();
        }
        if (_reserveUsdc == 0 || _reserveZama == 0) {
            revert InsufficientLiquidity();
        }

        usdc.confidentialTransferFrom(msg.sender, address(this), FHE.asEuint64(usdcIn));
        zamaOut = _getAmountOut(usdcIn, _reserveUsdc, _reserveZama);

        if (zamaOut < minZamaOut || zamaOut == 0) {
            revert SlippageExceeded();
        }
        if (zamaOut >= _reserveZama) {
            revert InsufficientLiquidity();
        }

        _setReserves(uint256(_reserveUsdc) + usdcIn, uint256(_reserveZama) - zamaOut);
        zama.confidentialTransfer(msg.sender, FHE.asEuint64(zamaOut));

        emit Swap(msg.sender, address(usdc), usdcIn, address(zama), zamaOut);
    }

    function swapExactZamaForUsdc(uint64 zamaIn, uint64 minUsdcOut) external returns (uint64 usdcOut) {
        if (zamaIn == 0) {
            revert InvalidAmount();
        }
        if (_reserveUsdc == 0 || _reserveZama == 0) {
            revert InsufficientLiquidity();
        }

        zama.confidentialTransferFrom(msg.sender, address(this), FHE.asEuint64(zamaIn));
        usdcOut = _getAmountOut(zamaIn, _reserveZama, _reserveUsdc);

        if (usdcOut < minUsdcOut || usdcOut == 0) {
            revert SlippageExceeded();
        }
        if (usdcOut >= _reserveUsdc) {
            revert InsufficientLiquidity();
        }

        _setReserves(uint256(_reserveUsdc) - usdcOut, uint256(_reserveZama) + zamaIn);
        usdc.confidentialTransfer(msg.sender, FHE.asEuint64(usdcOut));

        emit Swap(msg.sender, address(zama), zamaIn, address(usdc), usdcOut);
    }

    function _getAmountOut(uint64 amountIn, uint64 reserveIn, uint64 reserveOut) internal pure returns (uint64 amountOut) {
        uint256 amountInWithFee = uint256(amountIn) * FEE_NUMERATOR;
        uint256 numerator = amountInWithFee * uint256(reserveOut);
        uint256 denominator = (uint256(reserveIn) * FEE_DENOMINATOR) + amountInWithFee;
        amountOut = uint64(numerator / denominator);
    }

    function _setReserves(uint256 usdcReserve, uint256 zamaReserve) internal {
        if (usdcReserve > type(uint64).max || zamaReserve > type(uint64).max) {
            revert ReserveOverflow();
        }
        _reserveUsdc = uint64(usdcReserve);
        _reserveZama = uint64(zamaReserve);
    }

    function _sqrt(uint256 value) internal pure returns (uint256 result) {
        if (value == 0) {
            return 0;
        }
        uint256 z = (value + 1) / 2;
        result = value;
        while (z < result) {
            result = z;
            z = (value / z + z) / 2;
        }
    }
}
