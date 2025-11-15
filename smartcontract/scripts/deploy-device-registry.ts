import { network } from "hardhat";

async function main() {
  const { viem } = await network.connect();
  console.log("Deploying DeviceRegistry using network:", network.name);

  const [deployer] = await viem.getWalletClients();
  console.log("Deployer:", deployer.account.address);

  const registry = await viem.deployContract("DeviceRegistry", [], {
    account: deployer.account,
  });
  console.log("DeviceRegistry deployed to:", registry.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

