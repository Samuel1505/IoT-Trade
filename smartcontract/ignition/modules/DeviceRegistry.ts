import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeviceRegistryModule = buildModule("DeviceRegistryModule", (m) => {
  const registry = m.contract("DeviceRegistry");
  return { registry };
});

export default DeviceRegistryModule;

