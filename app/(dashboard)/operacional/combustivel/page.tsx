"use client";

import { Fuel } from "lucide-react";
import { OperationalCostPage } from "@/components/operational/operational-cost-page";

export default function CombustivelPage() {
  return (
    <OperationalCostPage
      type="FUEL"
      title="Combustível"
      description="Lance os gastos com combustível e vincule à obra"
      icon={Fuel}
    />
  );
}
