import { FinancePinGuard } from "@/components/finance-pin-guard";

export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  return <FinancePinGuard>{children}</FinancePinGuard>;
}
