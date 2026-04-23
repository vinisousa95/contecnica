import { setMemoryToken, getMemoryToken, setMemoryUser, getMemoryUser, clearMemory } from "./token";

const TOKEN_KEY = "contecnica_token";
const USER_KEY = "contecnica_user";

async function getStorage() {
  try {
    const mod = await import("@react-native-async-storage/async-storage");
    return mod.default;
  } catch {
    return null;
  }
}

export async function saveToken(token: string): Promise<void> {
  setMemoryToken(token);
  const storage = await getStorage();
  if (storage) await storage.setItem(TOKEN_KEY, token).catch(() => {});
}

export async function getToken(): Promise<string | null> {
  const mem = getMemoryToken();
  if (mem) return mem;
  try {
    const storage = await getStorage();
    if (!storage) return null;
    const token = await storage.getItem(TOKEN_KEY);
    if (token) setMemoryToken(token);
    return token;
  } catch {
    return null;
  }
}

export async function saveUser(user: object): Promise<void> {
  setMemoryUser(user);
  const storage = await getStorage();
  if (storage) await storage.setItem(USER_KEY, JSON.stringify(user)).catch(() => {});
}

export async function getUser(): Promise<any | null> {
  const mem = getMemoryUser();
  if (mem) return mem;
  try {
    const storage = await getStorage();
    if (!storage) return null;
    const raw = await storage.getItem(USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    setMemoryUser(user);
    return user;
  } catch {
    return null;
  }
}

export async function clearAuth(): Promise<void> {
  clearMemory();
  try {
    const storage = await getStorage();
    if (storage) {
      await storage.removeItem(TOKEN_KEY).catch(() => {});
      await storage.removeItem(USER_KEY).catch(() => {});
    }
  } catch {}
}
