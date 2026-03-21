export type UserRole = "student" | "teacher" | "admin";

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  characterModeEnabled: boolean;
  createdAt: string;
}

export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
