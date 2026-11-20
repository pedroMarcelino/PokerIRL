import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

// Os scripts são chamados da raiz do monorepo, então o cwd não aponta para
// apps/server. Carregamos por caminho absoluto para não cair no modo memory.
// Prioridade: variáveis já definidas (Vercel/Docker) > DOTENV_CONFIG_PATH >
// .env da raiz > .env legado em apps/server. O dotenv não sobrescreve o que
// já existe, então a ordem da lista define a precedência entre arquivos.
const serverDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(serverDirectory, "../../..");
const envFiles = [
  process.env.DOTENV_CONFIG_PATH,
  resolve(projectRoot, ".env"),
  resolve(serverDirectory, "../.env"),
].filter((path): path is string => Boolean(path));
for (const path of envFiles) dotenv.config({ path });

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DB_DRIVER: z.enum(["memory", "mongodb"]).default("memory"),
  MONGODB_URI: z.string().min(1).optional(),
  MONGODB_DB: z.string().min(1).default("cassino_denso"),
  CORS_ORIGIN: z.string().min(1).optional(),
});

export const env = schema.parse(process.env);

if (env.DB_DRIVER === "mongodb" && !env.MONGODB_URI) {
  throw new Error("MONGODB_URI é obrigatório quando DB_DRIVER=mongodb");
}
