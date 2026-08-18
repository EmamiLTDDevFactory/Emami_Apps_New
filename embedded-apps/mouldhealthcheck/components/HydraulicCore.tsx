import React from "react";
import * as Icons from "phosphor-react-native";
import InspectionChecklist from "@/components/inspection/InspectionChecklist";

export default function HydraulicCore() {
  return (
    <InspectionChecklist
      code="HC"
      title="Hydraulic Core / Slides"
      subtitle="Hydraulic core pull / slides (if any)"
      icon={<Icons.Drop size={22} color="#fff" weight="fill" />}
    />
  );
}
