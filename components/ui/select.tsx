import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

/**
 * IMPORTANTE — quando as `options` chegam de uma query (clientes, obras,
 * categorias), passe `value` e deixe o select CONTROLADO.
 *
 * Motivo: num select não controlado o navegador só guarda o que existe entre as
 * `<option>`. Na primeira renderização as opções ainda estão vazias, então o
 * valor gravado não tem opção correspondente e é descartado; quando as opções
 * chegam, o navegador seleciona a PRIMEIRA da lista. O formulário passa a exibir
 * — e a salvar — um registro que o usuário nunca escolheu. Foi exatamente isso
 * que reatribuía a obra para o primeiro cliente em ordem alfabética.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, placeholder, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    // Rede de segurança: se o valor atual não está entre as opções (lista ainda
    // carregando, registro inativo, ou além do limite da página), guardamos o
    // valor numa opção própria. Sem ela o select cairia para outra opção e
    // salvar trocaria o vínculo sem o usuário perceber.
    const value = typeof props.value === "string" ? props.value : undefined;
    const valueMissing = !!value && !options.some((o) => o.value === value);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            id={inputId}
            className={cn(
              "flex h-9 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 pr-10 py-2 text-sm shadow-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA580C] focus-visible:border-transparent",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
              error && "border-red-500 focus-visible:ring-red-500",
              // Cinza só quando o select é controlado e está vazio (mostrando o
              // placeholder). Antes a condição era `!props.value`, o que pintava
              // de cinza todo select não controlado, mesmo com opção escolhida.
              value === "" && "text-gray-400",
              className
            )}
            ref={ref}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {valueMissing && <option value={value}>—</option>}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="text-gray-900"
              >
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
