import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import { AuthorizeResponse } from "./next-auth";
import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { CLIENT_ROUTES } from "@/routes/client.routes";

async function refreshToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(BACKEND_ROUTES.urlRefreshToken, {
      method: "POST",
      headers: {
        authorization: `Refresh ${token.backendTokens.refreshToken}`,
      },
    });

    if (!res.ok) {
      console.log("Error al refrescar el token:", res.status);
      // Retorna el token actual si no se puede refrescar
      return token;
    }

    const response = await res.json();

    return {
      ...token,
      backendTokens: response,
    };
  } catch (error) {
    console.error("Error en refreshToken:", error);
    // Retorna el token actual en caso de error
    return token;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "email", type: "text", placeholder: "user or email" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const res = await fetch(BACKEND_ROUTES.urlLogin, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });

        if (!res.ok) return null;

        return await res.json();
      },
    }),
  ],
  pages: {
    signIn: CLIENT_ROUTES.urlLogin,
    error: CLIENT_ROUTES.urlLogin,
    signOut: CLIENT_ROUTES.urlSignOut,
  },
  callbacks: {
    async jwt({ token, user }) {
      // Primera vez después del login
      if (user) {
        const authResponse = user as unknown as AuthorizeResponse;
        return {
          ...token,
          user: authResponse.user,
          backendTokens: authResponse.backendTokens,
        };
      }

      // Validar si el token ha expirado
      // expiresIn está en segundos, convertir a segundos actuales
      const currentTime = Math.floor(new Date().getTime() / 1000);
      const tokenExpTime = token.backendTokens?.expiresIn;

      if (tokenExpTime && currentTime < tokenExpTime) {
        return token;
      }

      console.log("Token expirado, refrescando...");
      return await refreshToken(token);
    },
    async session({ token, session }) {
      session.user = token.user;
      session.backendTokens = token.backendTokens;
      return session;
    },
  },
};
