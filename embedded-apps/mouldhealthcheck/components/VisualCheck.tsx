import React from "react";
import * as Icons from "phosphor-react-native";
import InspectionChecklist from "@/components/inspection/InspectionChecklist";

export default function VisualCheck() {
  return (
    <InspectionChecklist
      code="VB"
      title="Visual & Condition Check"
      subtitle="Visual & basic condition check in mould"
      icon={<Icons.Eye size={22} color="#fff" weight="fill" />}
    />
  );
}
