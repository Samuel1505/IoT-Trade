import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("DeviceRegistry", async () => {
  const { viem } = await network.connect();

  const sampleDevice = {
    address: "0x1111111111111111111111111111111111111111",
    name: "Edge Weather Station",
    type: "Weather",
    location: "Lisbon, PT",
    price: 1_000_000_000_000_000n, // 0.001 ETH
    duration: 7n * 24n * 60n * 60n,
    metadataURI: "ipfs://device-metadata",
  };

  it("registers devices and emits metadata", async () => {
    const registry = await viem.deployContract("DeviceRegistry");
    const [owner] = await viem.getWalletClients();

    await viem.assertions.emit(
      registry.write.registerDevice(
        [
          sampleDevice.address,
          sampleDevice.name,
          sampleDevice.type,
          sampleDevice.location,
          sampleDevice.price,
          sampleDevice.duration,
          sampleDevice.metadataURI,
        ],
        { account: owner.account },
      ),
      registry,
      "DeviceRegistered",
    );

    const device = await registry.read.getDevice([sampleDevice.address]);
    const normalizedOwner = owner.account.address.toLowerCase();
    assert.equal(device.owner.toLowerCase(), normalizedOwner);
    assert.equal(device.name, sampleDevice.name);

    const ownerDevices = await registry.read.getDevicesByOwner([owner.account.address]);
    assert.equal(ownerDevices.length, 1);
    assert.equal(ownerDevices[0], sampleDevice.address);
  });

  it("prevents non-owners from updating device metadata", async () => {
    const registry = await viem.deployContract("DeviceRegistry");
    const [owner, stranger] = await viem.getWalletClients();

    await registry.write.registerDevice(
      [
        sampleDevice.address,
        sampleDevice.name,
        sampleDevice.type,
        sampleDevice.location,
        sampleDevice.price,
        sampleDevice.duration,
        sampleDevice.metadataURI,
      ],
      { account: owner.account },
    );

    await assert.rejects(
      registry.write.updateDevice(
        [
          sampleDevice.address,
          "Fake Update",
          sampleDevice.type,
          sampleDevice.location,
          sampleDevice.price,
          sampleDevice.duration,
          sampleDevice.metadataURI,
        ],
        { account: stranger.account },
      ),
    );
  });

  it("allows owner to pause a device", async () => {
    const registry = await viem.deployContract("DeviceRegistry");
    const [owner] = await viem.getWalletClients();

    await registry.write.registerDevice(
      [
        sampleDevice.address,
        sampleDevice.name,
        sampleDevice.type,
        sampleDevice.location,
        sampleDevice.price,
        sampleDevice.duration,
        sampleDevice.metadataURI,
      ],
      { account: owner.account },
    );

    await registry.write.setDeviceActive([sampleDevice.address, false], { account: owner.account });

    const device = await registry.read.getDevice([sampleDevice.address]);
    assert.equal(device.isActive, false);
  });

  it("records payments and forwards STT to owners", async () => {
    const registry = await viem.deployContract("DeviceRegistry");
    const [owner, buyer] = await viem.getWalletClients();

    await registry.write.registerDevice(
      [
        sampleDevice.address,
        sampleDevice.name,
        sampleDevice.type,
        sampleDevice.location,
        sampleDevice.price,
        sampleDevice.duration,
        sampleDevice.metadataURI,
      ],
      { account: owner.account },
    );

    const publicClient = await viem.getPublicClient();
    const ownerBalanceBefore = await publicClient.getBalance({ address: owner.account.address });

    const tx = await registry.write.purchaseAccess([sampleDevice.address], {
      account: buyer.account,
      value: sampleDevice.price,
    });
    await viem.assertions.emit(tx, registry, "DeviceAccessPurchased");

    const paid = await registry.read.totalPaid([buyer.account.address, sampleDevice.address]);
    assert.equal(paid, sampleDevice.price);

    const ownerBalanceAfter = await publicClient.getBalance({ address: owner.account.address });
    assert.ok(ownerBalanceAfter > ownerBalanceBefore);

    const expiry = await registry.read.getAccessExpiry([buyer.account.address, sampleDevice.address]);
    assert.ok(expiry > 0n);
    const secondTx = await registry.write.purchaseAccess([sampleDevice.address], {
      account: buyer.account,
      value: sampleDevice.price,
    });
    await viem.assertions.emit(secondTx, registry, "DeviceAccessPurchased");
    const newExpiry = await registry.read.getAccessExpiry([buyer.account.address, sampleDevice.address]);
    assert.ok(newExpiry > expiry);
  });
});

