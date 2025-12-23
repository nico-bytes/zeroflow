import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:swap:addresses", "Prints ZamaSwap, cUSDC, and cZama addresses").setAction(
  async function (_taskArguments: TaskArguments, hre) {
    const { deployments } = hre;

    const usdc = await deployments.get("ERC7984USDC");
    const zama = await deployments.get("ERC7984Zama");
    const swap = await deployments.get("ZamaSwap");

    console.log(`ERC7984USDC: ${usdc.address}`);
    console.log(`ERC7984Zama: ${zama.address}`);
    console.log(`ZamaSwap   : ${swap.address}`);
  },
);

task("task:swap:mint", "Mints cUSDC or cZama to a target address")
  .addParam("token", "Token symbol: usdc or zama")
  .addParam("to", "Recipient address")
  .addParam("amount", "Amount in token base units (6 decimals)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const token = (taskArguments.token as string).toLowerCase();
    const amount = BigInt(taskArguments.amount);

    const tokenName = token === "usdc" ? "ERC7984USDC" : token === "zama" ? "ERC7984Zama" : "";
    if (!tokenName) {
      throw new Error(`Invalid token argument. Use "usdc" or "zama".`);
    }

    const deployment = await deployments.get(tokenName);
    const contract = await ethers.getContractAt(tokenName, deployment.address);

    const tx = await contract.mint(taskArguments.to, amount);
    console.log(`Minting ${amount} ${tokenName} to ${taskArguments.to}...`);
    await tx.wait();
    console.log(`Mint complete.`);
  });

task("task:swap:add-liquidity", "Adds initial liquidity to the pool")
  .addParam("usdc", "cUSDC amount in base units (6 decimals)")
  .addParam("zama", "cZama amount in base units (6 decimals)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const usdcAmount = BigInt(taskArguments.usdc);
    const zamaAmount = BigInt(taskArguments.zama);

    const usdcDeployment = await deployments.get("ERC7984USDC");
    const zamaDeployment = await deployments.get("ERC7984Zama");
    const swapDeployment = await deployments.get("ZamaSwap");

    const signer = (await ethers.getSigners())[0];
    const usdc = await ethers.getContractAt("ERC7984USDC", usdcDeployment.address);
    const zama = await ethers.getContractAt("ERC7984Zama", zamaDeployment.address);
    const swap = await ethers.getContractAt("ZamaSwap", swapDeployment.address);

    const until = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
    await (await usdc.connect(signer).setOperator(swapDeployment.address, until)).wait();
    await (await zama.connect(signer).setOperator(swapDeployment.address, until)).wait();

    const tx = await swap.connect(signer).addLiquidity(usdcAmount, zamaAmount);
    console.log(`Adding liquidity...`);
    await tx.wait();
    console.log(`Liquidity added.`);
  });
