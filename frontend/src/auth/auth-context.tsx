import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { api } from "../api/client";
import type { AuthResponse, Viewer } from "../types/domain";

interface AuthContextValue {
  token: string | null;
  viewer: Viewer | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    username: string;
    fullName: string;
    password: string;
  }) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const TOKEN_KEY = "mq-token";

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY) ?? null,
  );
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await api.me(token);
        setViewer(me);
      } catch {
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    }
    void bootstrap();
  }, [token]);

  async function handleAuth(action: Promise<AuthResponse>) {
    const auth = await action;
    localStorage.setItem(TOKEN_KEY, auth.accessToken);
    setToken(auth.accessToken);
    setViewer({
      id: auth.userId,
      email: auth.email,
      username: auth.username,
      fullName: auth.fullName,
      role: auth.role,
      emailVerified: auth.emailVerified,
    });
    return auth;
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      viewer,
      isLoading,
      login: async (email, password) => {
        await handleAuth(api.login(email, password));
      },
      register: async (payload) => {
        return handleAuth(api.register(payload));
      },
      logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setViewer(null);
      },
    }),
    [token, viewer, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
