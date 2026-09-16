import { FinancePinGuard } from "@/components/finance-pin-guard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <FinancePinGuard>{children}</FinancePinGuard>;
}
