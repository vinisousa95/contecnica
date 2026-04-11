import { apiSuccess } from "@/lib/utils";

export async function POST() {
  const response = apiSuccess({ message: "Logout realizado com sucesso" });
  response.headers.set(
    "Set-Cookie",
    "contecnica_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
  );
  return response;
}
