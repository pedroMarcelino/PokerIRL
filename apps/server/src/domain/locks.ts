/**
 * Mutex simples por chave. Garante que duas apostas na mesma sala não
 * leiam/gravem o mesmo documento ao mesmo tempo.
 */
const locks = new Map<string, Promise<void>>();

export async function withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => gate);
  locks.set(key, tail);

  await previous;
  try {
    return await task();
  } finally {
    release();
    if (locks.get(key) === tail) locks.delete(key);
  }
}
