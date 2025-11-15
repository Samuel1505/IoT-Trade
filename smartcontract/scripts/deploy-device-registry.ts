import { network } from "hardhat";

const { viem } = await network.connect();

async function main() {
  console.log("Deploying DeviceRegistry using network:", viem.getNetwork().name);
  const [deployer] = await viem.getWalletClients();
  console.log("Deployer:", deployer.account.address);

  const registry = await viem.deployContract("DeviceRegistry", [], { account: deployer.account });
  console.log("DeviceRegistry deployed to:", registry.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

