import { z } from "zod";

/**
 * Mantém de `source` apenas as chaves que o schema conhece.
 *
 * Existe por um motivo concreto e recorrente: telas de edição carregam o objeto
 * da API e espalham a resposta inteira nos `defaultValues` do formulário
 * (`{ ...project }`). A resposta traz campos que o servidor gerencia — `id`,
 * `createdAt`, `updatedAt` — e objetos de relação (`client`, `expenses`,
 * `financialSummary`). O React Hook Form envia tudo isso no submit, e os schemas
 * são estritos, então a gravação é recusada com "Unrecognized key(s)".
 *
 * Filtrar pelo schema em vez de manter uma lista de campos à mão: quando o
 * schema muda, isto acompanha sozinho.
 *
 * @example
 *   const defaultValues = pickSchemaFields(projectSchema, project);
 */
export function pickSchemaFields<T extends z.ZodRawShape>(
  schema: z.ZodObject<T> | z.ZodEffects<z.ZodObject<T>>,
  source: Record<string, unknown> | null | undefined
): Partial<z.infer<z.ZodObject<T>>> {
  if (!source) return {};

  // `.strict()` e `.partial()` continuam sendo ZodObject; `.refine()` embrulha
  // num ZodEffects, então é preciso desembrulhar para chegar ao shape.
  const object = ("shape" in schema ? schema : (schema as any)._def.schema) as z.ZodObject<T>;
  const known = Object.keys(object.shape);

  const out: Record<string, unknown> = {};
  for (const key of known) {
    if (key in source) out[key] = source[key];
  }
  return out as Partial<z.infer<z.ZodObject<T>>>;
}
