import { clearPortalSessionCookie } from "@/lib/portal-auth";
import { apiSuccess } from "@/lib/utils";

export async function POST() {
  clearPortalSessionCookie();
  return apiSuccess({ message: "Logout realizado" });
}
