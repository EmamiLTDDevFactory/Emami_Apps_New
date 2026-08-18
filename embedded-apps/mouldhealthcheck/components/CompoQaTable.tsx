import React from "react";
import * as Icons from "phosphor-react-native";
import InspectionChecklist from "@/components/inspection/InspectionChecklist";

export default function CompoQaTable() {
  return (
    <InspectionChecklist
      code="NI"
      title="Component Quality"
      subtitle="Mould quality assurance"
      icon={<Icons.SealCheck size={22} color="#fff" weight="fill" />}
    />
  );
}
