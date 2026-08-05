"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, type ClientInput } from "@/lib/validations";
import { pickSchemaFields } from "@/lib/form-utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MapPin, Phone } from "lucide-react";
import { useCepLookup } from "@/hooks/use-cep-lookup";
import { maskCpfCnpj, maskPhone, maskCep } from "@/lib/masks";

interface ClientFormProps {
  defaultValues?: Partial<ClientInput>;
  onSubmit: (data: ClientInput) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

export function ClientForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = "Salvar",
}: ClientFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      status: "ACTIVE",
      // Filtra pelo schema: telas de edição passam a resposta da API inteira
      // (id, createdAt, relações) e o schema é estrito — sem isto a gravação
      // é recusada com "Unrecognized key(s)". Ver lib/form-utils.ts.
      ...pickSchemaFields(clientSchema, defaultValues as any),
    },
  });

  const { lookupCep, isLookingUp } = useCepLookup(setValue);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            Dados Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Nome / Razão Social"
              required
              placeholder="Nome completo ou razão social"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>
          <Input
            label="CPF / CNPJ"
            placeholder="000.000.000-00"
            inputMode="numeric"
            maxLength={18}
            error={errors.document?.message}
            {...register("document", {
              onChange: (e) => {
                const masked = maskCpfCnpj(e.target.value);
                e.target.value = masked;
                setValue("document", masked);
              },
            })}
          />
          <Select
            label="Status"
            options={[
              { value: "ACTIVE", label: "Ativo" },
              { value: "INACTIVE", label: "Inativo" },
            ]}
            error={errors.status?.message}
            {...register("status")}
          />
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            Contato
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Telefone / WhatsApp"
            placeholder="(11) 99999-9999"
            inputMode="numeric"
            maxLength={15}
            error={errors.phone?.message}
            {...register("phone", {
              onChange: (e) => {
                const masked = maskPhone(e.target.value);
                e.target.value = masked;
                setValue("phone", masked);
              },
            })}
          />
          <Input
            label="E-mail"
            type="email"
            placeholder="email@exemplo.com"
            error={errors.email?.message}
            {...register("email")}
          />
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            Endereço
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="CEP"
            placeholder="00000-000"
            inputMode="numeric"
            maxLength={9}
            error={errors.zipCode?.message}
            disabled={isLookingUp}
            {...register("zipCode", {
              onChange: (e) => {
                const masked = maskCep(e.target.value);
                e.target.value = masked;
                setValue("zipCode", masked);
                lookupCep(masked);
              },
            })}
          />
          <div className="md:col-span-2">
            <Input
              label="Logradouro"
              placeholder="Rua, Avenida, etc."
              error={errors.street?.message}
              {...register("street")}
            />
          </div>
          <Input
            label="Número"
            placeholder="000"
            error={errors.number?.message}
            {...register("number")}
          />
          <Input
            label="Complemento"
            placeholder="Apto, sala, bloco..."
            error={errors.complement?.message}
            {...register("complement")}
          />
          <Input
            label="Bairro"
            placeholder="Bairro"
            error={errors.neighborhood?.message}
            {...register("neighborhood")}
          />
          <Input
            label="Cidade"
            placeholder="Cidade"
            error={errors.city?.message}
            {...register("city")}
          />
          <Input
            label="Estado (UF)"
            placeholder="SP"
            maxLength={2}
            className="uppercase"
            error={errors.state?.message}
            {...register("state")}
          />
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-5">
          <Textarea
            label="Observações"
            placeholder="Informações adicionais sobre o cliente..."
            rows={3}
            error={errors.notes?.message}
            {...register("notes")}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancelar
        </Button>
        <Button type="submit" loading={isLoading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
