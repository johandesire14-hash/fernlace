// Supabase is used when configured. During local development without Supabase,
// a temporary in-browser mock is enabled so the client and creator journeys can be tested.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

type MockAccount = {
  id: string;
  email: string;
  password: string;
  role: 'client' | 'admin';
};

export const mockAccounts = {
  client: { email: 'client.test@fernlace.local', password: 'FernlaceClient123!' },
  createur: { email: 'createur.test@fernlace.local', password: 'FernlaceCreator123!' },
} as const;

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function serverSupabaseUrl(publicUrl: string, supabaseKey: string): string | undefined {
  if (typeof window !== 'undefined' || typeof process === 'undefined') return undefined;
  const serverUrl = process.env['SUPABASE_URL']?.replace(/\/+$/, '');
  if (!serverUrl || serverUrl === publicUrl || process.env['SUPABASE_PUBLISHABLE_KEY'] !== supabaseKey) return undefined;
  return serverUrl;
}

function createSupabaseFetch(supabaseUrl: string, supabaseKey: string): typeof fetch {
  const publicUrl = supabaseUrl.replace(/\/+$/, '');
  const serverUrl = serverSupabaseUrl(publicUrl, supabaseKey);
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }
    headers.set('apikey', supabaseKey);
    if (serverUrl) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith(`${publicUrl}/`)) {
        const target = serverUrl + url.slice(publicUrl.length);
        const request = typeof input === 'string' || input instanceof URL ? target : new Request(target, input);
        return fetch(request, { ...init, headers });
      }
    }
    return fetch(input, { ...init, headers });
  };
}

function mockStorageKey() {
  return 'fernlace.mock.session';
}

function readMockSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(mockStorageKey());
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeMockSession(session: unknown) {
  if (typeof window === 'undefined') return;
  if (session) window.localStorage.setItem(mockStorageKey(), JSON.stringify(session));
  else window.localStorage.removeItem(mockStorageKey());
}

function mockUser(account: MockAccount, metadata: Record<string, unknown> = {}) {
  return {
    id: account.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: account.email,
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { account_type: account.role === 'admin' ? 'createur' : 'client', ...metadata },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function createMockSupabase(): any {
  const accounts: MockAccount[] = [
    { id: 'mock-client-user', ...mockAccounts.client, role: 'client' },
    { id: 'mock-createur-user', ...mockAccounts.createur, role: 'admin' },
  ];
  const listeners = new Set<(event: string, session: any) => void>();
  const currentSession = () => readMockSession();
  const emit = (event: string, session: any) => listeners.forEach((listener) => listener(event, session));
  const result = (data: unknown = null, error: unknown = null) => Promise.resolve({ data, error });

  const mockOrders = [{
    id: 'mock-order-fern001',
    address: '12 rue des Tests',
    city: 'Paris',
    created_at: new Date().toISOString(),
    customer_name: 'Client de test',
    items: [{ name: 'Fernlace Classic', price: 129, quantity: 1, size: '42', color: 'Vert sauge' }],
    phone: '0600000000',
    status: 'Expédiée',
    total: 129,
    user_id: 'mock-client-user',
    tracking_latitude: 48.8566,
    tracking_longitude: 2.3522,
    tracking_updated_at: new Date().toISOString(),
  }];

  function from(table: string) {
    let filters: Record<string, unknown> = {};
    let updatePayload: Record<string, unknown> | null = null;
    const chain: any = {
      select: () => chain,
      eq: (key: string, value: unknown) => { filters[key] = value; return chain; },
      order: () => {
        if (table === 'orders') return result(mockOrders.filter((order) => Object.entries(filters).every(([key, value]) => order[key as keyof typeof order] === value)));
        return result([]);
      },
      maybeSingle: () => {
        if (table === 'user_roles') {
          const session = currentSession();
          return result(session?.user?.id === 'mock-createur-user' && filters.user_id === session.user.id && filters.role === 'admin' ? { role: 'admin' } : null);
        }
        return result(null);
      },
      update: (payload: Record<string, unknown>) => { updatePayload = payload; return chain; },
      then: (resolve: (value: unknown) => unknown) => {
        if (updatePayload && table === 'orders') {
          for (const order of mockOrders) {
            if (Object.entries(filters).every(([key, value]) => order[key as keyof typeof order] === value)) Object.assign(order, updatePayload);
          }
        }
        return Promise.resolve({ data: null, error: null }).then(resolve);
      },
    };
    return chain;
  }

  return {
    auth: {
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        const account = accounts.find((candidate) => candidate.email === email && candidate.password === password);
        if (!account) return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
        const user = mockUser(account);
        const session = { access_token: `mock-token-${account.id}`, refresh_token: `mock-refresh-${account.id}`, user };
        writeMockSession(session);
        emit('SIGNED_IN', session);
        return { data: { user, session }, error: null };
      },
      signUp: async ({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) => {
        const account = { id: `mock-${email}`, email, password, role: 'client' as const };
        accounts.push(account);
        const user = mockUser(account, options?.data ?? {});
        const session = { access_token: `mock-token-${account.id}`, refresh_token: `mock-refresh-${account.id}`, user };
        writeMockSession(session);
        emit('SIGNED_IN', session);
        return { data: { user, session }, error: null };
      },
      signOut: async () => { writeMockSession(null); emit('SIGNED_OUT', null); return { error: null }; },
      getUser: async () => { const session = currentSession(); return { data: { user: session?.user ?? null }, error: null }; },
      getSession: async () => { const session = currentSession(); return { data: { session }, error: null }; },
      updateUser: async ({ data }: { data: Record<string, unknown> }) => {
        const session = currentSession();
        if (!session?.user) return { data: { user: null }, error: { message: 'Not authenticated' } };
        session.user.user_metadata = { ...session.user.user_metadata, ...data };
        writeMockSession(session);
        emit('USER_UPDATED', session);
        return { data: { user: session.user }, error: null };
      },
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        listeners.add(callback);
        return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
      },
    },
    from,
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: async () => 'ok',
  };
}

function createSupabaseClient() {
  const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'] || process.env['SUPABASE_URL'];
  const supabaseKey = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || process.env['SUPABASE_PUBLISHABLE_KEY'];
  const mockEnabled = Boolean(import.meta.env.DEV && (!supabaseUrl || !supabaseKey || import.meta.env['VITE_MOCK_AUTH'] === 'true'));

  if (mockEnabled) return createMockSupabase();
  if (!supabaseUrl || !supabaseKey) {
    const missing = [...(!supabaseUrl ? ['SUPABASE_URL'] : []), ...(!supabaseKey ? ['SUPABASE_PUBLISHABLE_KEY'] : [])];
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(', ')}. Connect Supabase in Lovable Cloud.`);
  }
  return createClient<Database>(supabaseUrl, supabaseKey, {
    global: { fetch: createSupabaseFetch(supabaseUrl, supabaseKey) },
    auth: { storage: brokeredPreviewStorage(), persistSession: true, autoRefreshToken: true },
  });
}

export const isMockAuthEnabled = Boolean(import.meta.env.DEV && (!import.meta.env['VITE_SUPABASE_URL'] || !import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || import.meta.env['VITE_MOCK_AUTH'] === 'true'));
let _supabase: any;
export const supabase = new Proxy({} as any, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
