import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

// Os scripts são chamados da raiz do monorepo, então o cwd não aponta para
// apps/server. Carregar o .env por caminho absoluto evita cair no modo memory
// sem querer. DOTENV_CONFIG_PATH permite apontar para outro arquivo.
const serverDirectory = dirname(fileURLToPath(import.meta.url));
dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH ?? resolve(serverDirectory, "../.env"),
});

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DB_DRIVER: z.enum(["memory", "mongodb"]).default("memory"),
  MONGODB_URI: z.string().min(1).optional(),
  MONGODB_DB: z.string().min(1).default("cassino_denso"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
});

export const env = schema.parse(process.env);

if (env.DB_DRIVER === "mongodb" && !env.MONGODB_URI) {
  throw new Error("MONGODB_URI é obrigatório quando DB_DRIVER=mongodb");
}
