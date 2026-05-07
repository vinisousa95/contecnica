import { FinancePinGuard } from "@/components/finance-pin-guard";

export default function GastosPessoaisLayout({ children }: { children: React.ReactNode }) {
  return <FinancePinGuard>{children}</FinancePinGuard>;
}
