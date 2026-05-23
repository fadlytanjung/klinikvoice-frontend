import { post, get } from "./client";
import type { Me, TokenPair } from "@/types";

export const login = (email: string, password: string) =>
  post<TokenPair>("/auth/login", { email, password });

export interface GoogleLoginBody {
  id_token: string;
  refresh_token: string;
  scopes: string;
}
export const googleLogin = (body: GoogleLoginBody) => post<TokenPair>("/auth/google", body);

export const logout = (refresh_token: string) => post<void>("/auth/logout", { refresh_token });

export const me = () => get<Me>("/auth/me");
