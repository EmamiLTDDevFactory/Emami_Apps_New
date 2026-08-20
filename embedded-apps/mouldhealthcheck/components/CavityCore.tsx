import React from "react";
import * as Icons from "phosphor-react-native";
import InspectionChecklist from "@/components/inspection/InspectionChecklist";

export default function CavityCore() {
  return (
    <InspectionChecklist
      code="CC"
      title="Cavity & Core"
      subtitle="Cavity & core condition check points"
      icon={<Icons.Cube size={22} color="#fff" weight="fill" />}
      showMouldMasterData
    />
  );
}
