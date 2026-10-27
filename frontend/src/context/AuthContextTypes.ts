import type { AccountContext, LoginRequest, UserResponse } from "../api/types";

export interface AuthState {
  user: UserResponse | null;
  context: AccountContext | null;
  loading: boolean;
  initialized: boolean;
  /** Výpadek API při ověřování session se liší od anonymního stavu (401). */
  sessionError: string | null;
}

export interface AuthContextValue extends AuthState {
  login: (request: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
