import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LifeBridgeModule = buildModule("LifeBridgeModule", (m) => {
  const pledge = m.contract("LifeBridgePledge");
  return { pledge };
});

export default LifeBridgeModule;