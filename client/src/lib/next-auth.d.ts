/* eslint-disable @typescript-eslint/no-unused-vars */
import NextAuth from "next-auth";
import { User } from "@/interfaces";

export type userType = Omit<User, "role_id" | "is_active">;

export interface backendTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthorizeResponse {
  user: User;
  backendTokens: backendTokens;
}

declare module "next-auth" {
  interface Session {
    user: userType;
    backendTokens: backendTokens;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user: userType;
    backendTokens: backendTokens;
  }
}
