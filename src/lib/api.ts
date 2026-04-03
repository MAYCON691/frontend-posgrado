// src/lib/api.ts
export type ApiUser = {
  id: string;
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'USER';
  name: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_URI || // por si lo nombraste distinto
  'http://localhost:5000/api';

const LS_AT = 'AT';
const LS_RT = 'RT';
const LS_USER = 'USER';

export const tokenStore = {
  getAccess(): string | null {
    try { return localStorage.getItem(LS_AT); } catch { return null; }
  },
  getRefresh(): string | null {
    try { return localStorage.getItem(LS_RT); } catch { return null; }
  },
  getUser(): ApiUser | null {
    try {
      const s = localStorage.getItem(LS_USER);
      return s ? (JSON.parse(s) as ApiUser) : null;
    } catch {
      return null;
    }
  },
  saveAll(user: ApiUser, at: string, rt: string) {
    localStorage.setItem(LS_AT, at);
    localStorage.setItem(LS_RT, rt);
    localStorage.setItem(LS_USER, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(LS_AT);
    localStorage.removeItem(LS_RT);
    localStorage.removeItem(LS_USER);
  },
};

type JsonBody = Record<string, unknown> | undefined;

async function fetchWithAuth<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: JsonBody,
  retry = true
): Promise<T> {
  const url = `${API_URL}${path}`;
  const at = tokenStore.getAccess();

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(at ? { Authorization: `Bearer ${at}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Si OK
  if (res.ok) return (await res.json()) as T;

  // Si 401, intentamos refresh una vez
  if (res.status === 401 && retry) {
    const rt = tokenStore.getRefresh();
    if (!rt) throw new Error('Sesión expirada');

    const r = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rt}`,
      },
      body: JSON.stringify({ refresh_token: rt }),
    });

    if (!r.ok) {
      tokenStore.clear();
      const e = await safeJson(r);
      throw new Error(e?.message || 'No se pudo refrescar sesión');
    }

    const data = (await r.json()) as {
      user: ApiUser;
      access_token: string;
      refresh_token: string;
    };

    tokenStore.saveAll(data.user, data.access_token, data.refresh_token);

    // reintenta una sola vez
    return fetchWithAuth<T>(method, path, body, false);
  }

  const err = await safeJson(res);
  throw new Error(err?.message || `Error ${res.status}`);
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export const api = {
  get<T>(path: string) {
    return fetchWithAuth<T>('GET', path);
  },
  post<T>(path: string, body?: JsonBody) {
    return fetchWithAuth<T>('POST', path, body);
  },
  put<T>(path: string, body?: JsonBody) {
    return fetchWithAuth<T>('PUT', path, body);
  },
  del<T = { ok: true }>(path: string) {
    return fetchWithAuth<T>('DELETE', path);
  },
};
