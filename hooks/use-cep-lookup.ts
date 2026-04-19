import { useState, useCallback } from "react";
import { UseFormSetValue, FieldValues, Path } from "react-hook-form";

interface CepAddress {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export function useCepLookup<T extends FieldValues>(setValue: UseFormSetValue<T>) {
  const [isLookingUp, setIsLookingUp] = useState(false);

  const lookupCep = useCallback(
    async (cep: string) => {
      const clean = cep.replace(/\D/g, "");
      if (clean.length !== 8) return;
      setIsLookingUp(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (data.erro) return;
        const addr: CepAddress = {
          street: data.logradouro ?? "",
          neighborhood: data.bairro ?? "",
          city: data.localidade ?? "",
          state: data.uf ?? "",
        };
        (Object.entries(addr) as [string, string][]).forEach(([key, val]) => {
          if (val) setValue(key as Path<T>, val as any);
        });
      } catch {
        // silent — user can fill manually
      } finally {
        setIsLookingUp(false);
      }
    },
    [setValue]
  );

  return { lookupCep, isLookingUp };
}
