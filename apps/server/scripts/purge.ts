/**
 * Limpeza manual do banco. Sem argumentos apaga todas as salas e apostas;
 * com um código de 6 dígitos apaga apenas aquela sala (útil após validação).
 *
 *   npm run db:purge            -> apaga tudo
 *   npm run db:purge -- 123456  -> apaga só a sala 123456
 *
 * A URI nunca é exibida: ela vem dos .env via src/env.ts.
 */
import { connectMongo, disconnectMongo } from "../src/db/mongo.js";
import { env } from "../src/env.js";

async function main(): Promise<void> {
  if (env.DB_DRIVER !== "mongodb" || !env.MONGODB_URI) {
    throw new Error("Defina DB_DRIVER=mongodb e MONGODB_URI para limpar o banco");
  }

  const code = process.argv[2];
  if (code && !/^\d{6}$/.test(code)) {
    throw new Error("Código de sala inválido: use 6 dígitos");
  }

  const db = await connectMongo(env.MONGODB_URI, env.MONGODB_DB);
  try {
    const rooms = await db.collection("rooms").deleteMany(code ? { _id: code } : {});
    const bets = await db.collection("bets").deleteMany(code ? { roomCode: code } : {});
    const alvo = code ? ` da sala ${code}` : "";
    console.log(
      `${rooms.deletedCount} sala(s) e ${bets.deletedCount} aposta(s) removida(s)${alvo} de ${env.MONGODB_DB}.`,
    );
  } finally {
    await disconnectMongo();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
