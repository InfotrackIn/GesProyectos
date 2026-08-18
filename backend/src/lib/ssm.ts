import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const client = new SSMClient({});
const cache = new Map<string, { value: string; expires: number }>();
const TTL_MS = 5 * 60 * 1000;

export async function getParam(name: string): Promise<string | null> {
  const cached = cache.get(name);
  if (cached && cached.expires > Date.now()) return cached.value;
  try {
    const res = await client.send(
      new GetParameterCommand({ Name: name, WithDecryption: true })
    );
    const value = res.Parameter?.Value ?? null;
    if (value) cache.set(name, { value, expires: Date.now() + TTL_MS });
    return value;
  } catch {
    return null;
  }
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  table: string;
}

/**
 * Lee la configuracion de Supabase (Epica 6). Devuelve null si el equipo aun
 * no ha entregado URL + anon key (queda en modo manual).
 */
export async function getSupabaseConfig(): Promise<SupabaseConfig | null> {
  const url = await getParam(process.env.SUPABASE_URL_PARAM ?? "");
  const anonKey = await getParam(process.env.SUPABASE_ANON_KEY_PARAM ?? "");
  if (!url || !anonKey || url.startsWith("PENDIENTE") || anonKey.startsWith("PENDIENTE")) {
    return null;
  }
  const table = (await getParam(process.env.SUPABASE_TABLE_PARAM ?? "")) ?? "surveys";
  return { url: url.replace(/\/$/, ""), anonKey, table };
}
