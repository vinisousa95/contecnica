"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Logo3D } from "@/components/ui/logo-3d";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});
type FormData = z.infer<typeof schema>;

export default function PortalLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch("/api/portal/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      router.push("/portal/dashboard");
      router.refresh();
    } catch {
      toast({ title: "Erro ao entrar", description: "E-mail ou senha incorretos.", variant: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1F2937] via-[#111827] to-[#0a0f16] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo3D className="mb-5" />
          <p className="text-gray-400 text-sm">Portal do Cliente</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Bem-vindo ao portal</h2>
          <p className="text-sm text-gray-500 mb-6">Acompanhe o andamento da sua obra</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              required
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Senha"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              error={errors.password?.message}
              {...register("password")}
            />
            <Button type="submit" className="w-full h-10" loading={isSubmitting}>
              Entrar no portal
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Problemas para acessar? Contate a Contécnica.
            </p>
          </div>
        </div>

        <p className="text-center text-blue-400 text-xs mt-6">
          © {new Date().getFullYear()} Contécnica. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
