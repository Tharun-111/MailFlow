/**
 * useAuth Hook — Handle authentication state
 */

import { useState, useCallback } from "react";
import { login as loginAPI } from "../services/api";

export const useAuth = () => {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    return token ? { token } : null;
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const { access } = await loginAPI(username, password);
      localStorage.setItem("token", access);
      setUser({ token: access });
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  return { user, login, logout, error, loading };
};
