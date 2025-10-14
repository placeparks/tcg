// lib/net-utils.ts
export const metaCache = new Map<string, any>();

export async function chunked<T>(jobs: (() => Promise<T>)[], size = 20) {
  const out: T[] = [];
  for (let i = 0; i < jobs.length; i += size) {
    out.push(...await Promise.all(jobs.slice(i, i + size).map(fn => fn())));
  }
  return out;
}
