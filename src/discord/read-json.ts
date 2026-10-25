export async function readJson<T>(body: Body): Promise<T> {
  return await body.json()
}
