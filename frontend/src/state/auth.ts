// src/state/auth.ts
import { atom, useRecoilValue, useSetRecoilState } from 'recoil';
import { useCallback } from 'react';

const AUTH_TOKEN_KEY = 'aimaestro_token';

export const authTokenAtom = atom<string | null>({
  key: 'authTokenAtom',
  default: localStorage.getItem(AUTH_TOKEN_KEY),
});

export const useAuthToken = () => useRecoilValue(authTokenAtom);

export const useSetAuthToken = () => {
  const setState = useSetRecoilState(authTokenAtom);

  return useCallback(
    (token: string | null) => {
      setState(token);
      if (token == null) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      } else {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
      }
    },
    [setState]
  );
};

export const useAuth = () => {
  const setAuthToken = useSetAuthToken();
  const authToken = useAuthToken();

  const login = useCallback(async (username: string, password: string) => {
    // TODO: Implement actual login logic
    // For now, just set a dummy token
    setAuthToken('dummy_token');
  }, [setAuthToken]);

  const logout = useCallback(() => {
    setAuthToken(null);
  }, [setAuthToken]);

  return {
    isAuthenticated: !!authToken,
    login,
    logout,
  };
};
