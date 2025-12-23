import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedUsdc = await deploy("ERC7984USDC", {
    from: deployer,
    log: true,
  });

  const deployedZama = await deploy("ERC7984Zama", {
    from: deployer,
    log: true,
  });

  const deployedSwap = await deploy("ZamaSwap", {
    from: deployer,
    args: [deployedUsdc.address, deployedZama.address],
    log: true,
  });

  const deployedFHECounter = await deploy("FHECounter", {
    from: deployer,
    log: true,
  });

  console.log(`ERC7984USDC contract: `, deployedUsdc.address);
  console.log(`ERC7984Zama contract: `, deployedZama.address);
  console.log(`ZamaSwap contract: `, deployedSwap.address);
  console.log(`FHECounter contract: `, deployedFHECounter.address);
};
export default func;
func.id = "deploy_zama_swap"; // id required to prevent reexecution
func.tags = ["ZamaSwap", "ERC7984USDC", "ERC7984Zama", "FHECounter"];
