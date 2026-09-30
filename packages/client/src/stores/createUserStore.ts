import dayjs from "dayjs";
import type { BoundStateCreator } from "~/hooks/useBoundStore";
import {
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
  setStoredAuth,
  type StoredAuthUser,
} from "~/lib/authStorage";

export type UserSlice = {
  id: string;
  email: string;
  name: string;
  username: string;
  token: string | null;
  joinedAt: dayjs.Dayjs;
  loggedIn: boolean;
  // True once the client has checked localStorage for a persisted session.
  // Starts false on both server and client so the first client render
  // matches the server-rendered HTML (no hydration mismatch); flips to
  // true from an effect in _app.tsx after mount.
  hasHydrated: boolean;
  setName: (name: string) => void;
  setUsername: (username: string) => void;
  setAuthenticatedUser: (payload: { token: string; user: StoredAuthUser }) => void;
  hydrateFromStorage: () => void;
  logOut: () => void;
};

export const createUserSlice: BoundStateCreator<UserSlice> = (set) => ({
  id: "",
  email: "",
  name: "",
  username: "",
  token: null,
  joinedAt: dayjs(),
  loggedIn: false,
  hasHydrated: false,
  setName: (name: string) => set(() => ({ name })),
  setUsername: (username: string) => set(() => ({ username })),
  setAuthenticatedUser: ({ token, user }) => {
    setStoredAuth(token, user);
    set(() => ({
      loggedIn: true,
      hasHydrated: true,
      token,
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
    }));
  },
  hydrateFromStorage: () => {
    const token = getStoredToken();
    const user = getStoredUser();
    set(() =>
      token && user
        ? {
            hasHydrated: true,
            loggedIn: true,
            token,
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
          }
        : { hasHydrated: true },
    );
  },
  logOut: () => {
    clearStoredAuth();
    set(() => ({
      loggedIn: false,
      token: null,
      id: "",
      email: "",
    }));
  },
});
