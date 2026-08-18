import React from "react";
import * as Icons from "phosphor-react-native";
import InspectionChecklist from "@/components/inspection/InspectionChecklist";

export default function CollapsibleCore() {
  return (
    <InspectionChecklist
      code="FC"
      title="Collapsible Core"
      subtitle="For collapsible core type mould"
      icon={<Icons.ArrowsInLineVertical size={22} color="#fff" weight="bold" />}
    />
  );
}
