"use client";

import { Receipt } from "lucide-react";
import { OperationalCostPage } from "@/components/operational/operational-cost-page";

export default function PedagioPage() {
  return (
    <OperationalCostPage
      type="TOLL"
      title="Pedágio"
      description="Lance os gastos com pedágio e vincule à obra"
      icon={Receipt}
    />
  );
}
