// In-memory token store — no native modules, always safe to import
let _token: string | null = null;
let _user: any = null;

export function setMemoryToken(token: string) { _token = token; }
export function getMemoryToken() { return _token; }
export function setMemoryUser(user: any) { _user = user; }
export function getMemoryUser() { return _user; }
export function clearMemory() { _token = null; _user = null; }
