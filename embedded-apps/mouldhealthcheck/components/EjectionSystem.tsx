import React from "react";
import * as Icons from "phosphor-react-native";
import InspectionChecklist from "@/components/inspection/InspectionChecklist";

export default function EjectionSystem() {
  return (
    <InspectionChecklist
      code="ES"
      title="Ejection System"
      subtitle="Ejection system check points"
      icon={<Icons.ArrowLineUp size={22} color="#fff" weight="bold" />}
    />
  );
}
