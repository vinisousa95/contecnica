"use client";

import { Bus } from "lucide-react";
import { OperationalCostPage } from "@/components/operational/operational-cost-page";

export default function TransportePage() {
  return (
    <OperationalCostPage
      type="TRANSPORT"
      title="Transporte"
      description="Lance os gastos com transporte e vincule à obra"
      icon={Bus}
    />
  );
}
