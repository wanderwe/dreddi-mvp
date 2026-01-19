import { supabaseOptional } from "@/lib/supabaseClient";

export type AuthUser = {
  id: string;
  email: string | null;
};

export type AuthProfile = {
  id: string;
  handle: string | null;
  displayName: string;
  email: string | null;
};

export type AuthState = {
  user: AuthUser | null;
  profile: AuthProfile | null;
  isLoggedIn: boolean;
  isMock: boolean;
};

const MOCK_USER_ID = "mock-user-0001";
const MOCK_EMAIL = "mock.user@example.com";
const MOCK_HANDLE = "mock-user";
const MOCK_DISPLAY_NAME = "Mock User";

const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const isMockAuthEnabled = () => {
  const mockFlagEnabled = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";

  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return mockFlagEnabled || !hasSupabaseConfig;
};

export const buildAuthState = (user: AuthUser | null): AuthState => ({
  user,
  profile: null,
  isLoggedIn: Boolean(user),
  isMock: false,
});

export const getMockAuthState = (): AuthState => ({
  user: { id: MOCK_USER_ID, email: MOCK_EMAIL },
  profile: {
    id: MOCK_USER_ID,
    handle: MOCK_HANDLE,
    displayName: MOCK_DISPLAY_NAME,
    email: MOCK_EMAIL,
  },
  isLoggedIn: true,
  isMock: true,
});

export async function getAuthState(): Promise<AuthState> {
  if (isMockAuthEnabled()) {
    return getMockAuthState();
  }

  const client = supabaseOptional;
  if (!client) {
    return buildAuthState(null);
  }

  const { data } = await client.auth.getSession();
  const sessionUser = data.session?.user;
  const user = sessionUser ? { id: sessionUser.id, email: sessionUser.email ?? null } : null;

  return buildAuthState(user);
}
