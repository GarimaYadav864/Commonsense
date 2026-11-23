
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import api from "../services/api";

export type UserRole = "requester" | "provider" | "volunteer" | "admin";
export type PublicUserRole = Exclude<UserRole, "admin">;

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  location?: string;
  role: UserRole;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  location: string;
  role: PublicUserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (data: RegisterData) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "commonsense_token";
const USER_KEY = "commonsense_user";

function normalizeUser(rawUser: any): AuthUser {
  if (!rawUser || typeof rawUser !== "object") {
    throw new Error("Invalid user information received from the server.");
  }

  const id = rawUser.id || rawUser._id;
  const validRoles: UserRole[] = [
    "requester",
    "provider",
    "volunteer",
    "admin",
  ];

  if (
    !id ||
    !rawUser.name ||
    !rawUser.email ||
    !validRoles.includes(rawUser.role)
  ) {
    throw new Error("The server returned incomplete user information.");
  }

  return {
    _id: String(id),
    name: rawUser.name,
    email: rawUser.email,
    location: rawUser.location || "",
    role: rawUser.role,
  };
}

function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getStoredUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? normalizeUser(JSON.parse(stored)) : null;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY)
  );

  const [user, setUser] = useState<AuthUser | null>(getStoredUser);

  const [loading, setLoading] = useState(
    () => Boolean(localStorage.getItem(TOKEN_KEY))
  );

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const verifySession = async () => {
      setLoading(true);

      try {
        const response = await api.get("/auth/profile");
        const verifiedUser = normalizeUser(response.data.user);

        if (cancelled) return;

        localStorage.setItem(USER_KEY, JSON.stringify(verifiedUser));
        setUser(verifiedUser);
      } catch (error: any) {
        if (cancelled) return;

        if (error.response?.status === 401) {
          clearStoredSession();
          setToken(null);
          setUser(null);
        } else {
          // Keep the cached session if the API is temporarily unreachable.
          setUser(getStoredUser());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    verifySession();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const saveSession = (newToken: string, rawUser: any): AuthUser => {
    if (!newToken) {
      throw new Error("The server did not return an authentication token.");
    }

    const normalizedUser = normalizeUser(rawUser);

    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));

    setToken(newToken);
    setUser(normalizedUser);
    setLoading(false);

    return normalizedUser;
  };

  const login = async (
    email: string,
    password: string
  ): Promise<AuthUser> => {
    const response = await api.post("/auth/login", {
      email: email.trim(),
      password,
    });

    return saveSession(response.data.token, response.data.user);
  };

  const register = async (data: RegisterData): Promise<AuthUser> => {
    const response = await api.post("/auth/register", {
      ...data,
      name: data.name.trim(),
      email: data.email.trim(),
      location: data.location.trim(),
    });

    return saveSession(response.data.token, response.data.user);
  };

  const logout = () => {
    clearStoredSession();
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
}
