import { FinancePinGuard } from "@/components/finance-pin-guard";

export default function RelatoriosLayout({ children }: { children: React.ReactNode }) {
  return <FinancePinGuard>{children}</FinancePinGuard>;
}
