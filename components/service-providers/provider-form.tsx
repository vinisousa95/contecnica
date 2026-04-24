"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceProviderSchema, type ServiceProviderInput } from "@/lib/validations";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MapPin, Phone, Banknote, FileText } from "lucide-react";
import { useCepLookup } from "@/hooks/use-cep-lookup";
import { maskCpfCnpj, maskPhone, maskCep } from "@/lib/masks";

const SPECIALTY_OPTIONS = [
  { value: "ELECTRICAL", label: "Elétrica" },
  { value: "PLUMBING", label: "Hidráulica" },
  { value: "PAINTING", label: "Pintura" },
  { value: "MASONRY", label: "Alvenaria" },
  { value: "FINISHING", label: "Acabamento" },
  { value: "DRYWALL", label: "Drywall/Gesso" },
  { value: "CARPENTRY", label: "Marcenaria" },
  { value: "METALWORK", label: "Serralheria" },
  { value: "GLASSWORK", label: "Vidraçaria" },
  { value: "CLEANING", label: "Limpeza" },
  { value: "TRANSPORT", label: "Transporte" },
  { value: "ENGINEERING", label: "Engenharia" },
  { value: "ARCHITECTURE", label: "Arquitetura" },
  { value: "OTHER", label: "Outros" },
];

interface ServiceProviderFormProps {
  defaultValues?: Partial<ServiceProviderInput>;
  onSubmit: (data: ServiceProviderInput) => void;
  loading?: boolean;
}

export function ServiceProviderForm({ defaultValues, onSubmit, loading }: ServiceProviderFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceProviderInput>({
    resolver: zodResolver(serviceProviderSchema),
    defaultValues: {
      type: "INDIVIDUAL",
      specialty: "OTHER",
      status: "ACTIVE",
      ...defaultValues,
    },
  });

  const { lookupCep, isLookingUp } = useCepLookup(setValue);
  const providerType = watch("type");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Dados Cadastrais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            Dados Cadastrais
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
          <Select
            label="Tipo"
            options={[
              { value: "INDIVIDUAL", label: "Pessoa Física" },
              { value: "COMPANY", label: "Pessoa Jurídica" },
            ]}
            error={errors.type?.message}
            {...register("type")}
          />
          <Select
            label="Especialidade"
            options={SPECIALTY_OPTIONS}
            error={errors.specialty?.message}
            {...register("specialty")}
          />
          <Input
            label={providerType === "COMPANY" ? "CNPJ" : "CPF"}
            placeholder={providerType === "COMPANY" ? "00.000.000/0000-00" : "000.000.000-00"}
            inputMode="numeric"
            maxLength={18}
            error={errors.documentNumber?.message}
            {...register("documentNumber", {
              onChange: (e) => {
                const masked = maskCpfCnpj(e.target.value);
                e.target.value = masked;
                setValue("documentNumber", masked);
              },
            })}
          />
          {providerType === "INDIVIDUAL" && (
            <Input
              label="Data de Nascimento"
              type="date"
              error={errors.birthDate?.message}
              {...register("birthDate")}
            />
          )}
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

      {/* Contato */}
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

      {/* Endereço */}
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

      {/* Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Banknote className="h-4 w-4 text-gray-500" />
            Dados de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Chave Pix"
              placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
              error={errors.pixKey?.message}
              {...register("pixKey")}
            />
          </div>
          <div className="md:col-span-2">
            <Textarea
              label="Dados Bancários"
              placeholder="Banco, agência, conta corrente..."
              rows={2}
              error={errors.bankInfo?.message}
              {...register("bankInfo")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            Observações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Informações adicionais sobre o prestador..."
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
        <Button type="submit" loading={loading}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
