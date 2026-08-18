import React from "react";
import * as Icons from "phosphor-react-native";
import InspectionChecklist from "@/components/inspection/InspectionChecklist";

export default function BaseAlign() {
  return (
    <InspectionChecklist
      code="MA"
      title="Mould Base & Alignment"
      subtitle="Mould base & alignment check"
      icon={<Icons.Stack size={22} color="#fff" weight="fill" />}
    />
  );
}
