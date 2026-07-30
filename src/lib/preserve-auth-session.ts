export async function runPreservingAuthUid<T>(
  getAuthUid: () => Promise<string | null>,
  operation: () => Promise<T>,
): Promise<T> {
  const uidBefore = await getAuthUid();
  if (!uidBefore) throw new Error("Session Partner introuvable avant la création.");

  const result = await operation();
  const uidAfter = await getAuthUid();

  if (uidAfter !== uidBefore) {
    throw new Error("La session Partner a changé pendant la création du tenant.");
  }

  return result;
}
