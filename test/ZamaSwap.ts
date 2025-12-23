import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

describe("ZamaSwap", function () {
  let signers: Signers;
  let usdc: any;
  let zama: any;
  let swap: any;
  let swapAddress: string;

  before(async function () {
    const ethSigners = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    const usdcFactory = await ethers.getContractFactory("ERC7984USDC");
    const zamaFactory = await ethers.getContractFactory("ERC7984Zama");
    const swapFactory = await ethers.getContractFactory("ZamaSwap");

    usdc = await usdcFactory.deploy();
    zama = await zamaFactory.deploy();
    swap = await swapFactory.deploy(await usdc.getAddress(), await zama.getAddress());
    swapAddress = await swap.getAddress();
  });

  it("adds initial liquidity at 2:1 price", async function () {
    const usdcAmount = 2_000_000;
    const zamaAmount = 1_000_000;

    await usdc.mint(signers.alice.address, usdcAmount);
    await zama.mint(signers.alice.address, zamaAmount);

    const until = Math.floor(Date.now() / 1000) + 60 * 60;
    await usdc.connect(signers.alice).setOperator(swapAddress, until);
    await zama.connect(signers.alice).setOperator(swapAddress, until);

    await swap.connect(signers.alice).addLiquidity(usdcAmount, zamaAmount);

    const reserves = await swap.getReserves();
    expect(reserves[0]).to.eq(usdcAmount);
    expect(reserves[1]).to.eq(zamaAmount);

    const lpBalance = await swap.balanceOf(signers.alice.address);
    expect(lpBalance).to.be.gt(0);
  });

  it("swaps cUSDC for cZama", async function () {
    const usdcAmount = 2_000_000;
    const zamaAmount = 1_000_000;

    await usdc.mint(signers.alice.address, usdcAmount);
    await zama.mint(signers.alice.address, zamaAmount);

    const until = Math.floor(Date.now() / 1000) + 60 * 60;
    await usdc.connect(signers.alice).setOperator(swapAddress, until);
    await zama.connect(signers.alice).setOperator(swapAddress, until);

    await swap.connect(signers.alice).addLiquidity(usdcAmount, zamaAmount);

    const swapIn = 100_000;
    const minOut = 1;
    await swap.connect(signers.alice).swapExactUsdcForZama(swapIn, minOut);

    const reserves = await swap.getReserves();
    expect(reserves[0]).to.eq(usdcAmount + swapIn);
    expect(reserves[1]).to.be.lt(zamaAmount);

    const encryptedZamaBalance = await zama.confidentialBalanceOf(signers.alice.address);
    const decryptedZama = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedZamaBalance,
      await zama.getAddress(),
      signers.alice,
    );
    expect(decryptedZama).to.be.gt(0);
  });
});
