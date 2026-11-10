import { create } from "zustand";
import { api, clearSession, getAccessToken, getStoredUser, saveSession, saveUser } from "../api/client";
import { authApi } from "../api/endpoints";
import type { AuthUser, Session } from "../api/types";
import { connectErpSocket, disconnectErpSocket } from "../lib/socket";

type AuthState = {
  user: AuthUser | null;
  bootstrapped: boolean;
  status: "idle" | "loading";
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  setUser: (user: AuthUser) => void;
};

export const useAuth = create<AuthState>((set, get) => ({
  user: getStoredUser<AuthUser>(),
  bootstrapped: false,
  status: "idle",

  setUser: (user) => {
    saveUser(user);
    set({ user });
  },

  login: async (identifier, password) => {
    set({ status: "loading" });
    try {
      const session = await authApi.login(identifier, password);
      saveSession(session);
      set({ user: session.user, status: "idle", bootstrapped: true });
      const token = getAccessToken();
      if (token) connectErpSocket(token);
    } catch (err) {
      set({ status: "idle" });
      throw err;
    }
  },

  logout: async () => {
    try {
      const refresh = localStorage.getItem("erp_refresh");
      if (refresh) await authApi.logout(refresh);
    } catch {
      // ignore network errors on logout
    }
    disconnectErpSocket();
    clearSession();
    set({ user: null, bootstrapped: true });
  },

  bootstrap: async () => {
    if (get().bootstrapped) return;
    if (!getAccessToken()) {
      set({ bootstrapped: true, user: null });
      return;
    }
    try {
      const me = await api.get<AuthUser>("/auth/me");
      saveUser(me);
      set({ user: me, bootstrapped: true });
      connectErpSocket(getAccessToken() ?? "");
    } catch {
      clearSession();
      set({ user: null, bootstrapped: true });
    }
  },
}));

export function applySession(session: Session): void {
  saveSession(session);
  useAuth.getState().setUser(session.user);
}
