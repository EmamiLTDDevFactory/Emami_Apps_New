import React from "react";
import * as Icons from "phosphor-react-native";
import InspectionChecklist from "@/components/inspection/InspectionChecklist";

export default function CoolSystem() {
  return (
    <InspectionChecklist
      code="CS"
      title="Cooling System"
      subtitle="Cooling system check points"
      icon={<Icons.Snowflake size={22} color="#fff" weight="fill" />}
    />
  );
}
