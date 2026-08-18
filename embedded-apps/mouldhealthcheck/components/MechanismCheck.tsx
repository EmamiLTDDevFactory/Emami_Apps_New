import React from "react";
import * as Icons from "phosphor-react-native";
import InspectionChecklist from "@/components/inspection/InspectionChecklist";

export default function MechanismCheck() {
  return (
    <InspectionChecklist
      code="MC"
      title="Mechanism Check"
      subtitle="Mechanism check points (as per mould type)"
      icon={<Icons.Gear size={22} color="#fff" weight="fill" />}
    />
  );
}
