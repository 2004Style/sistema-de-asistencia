import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import { AuthorizeResponse } from "./next-auth";
import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { CLIENT_ROUTES } from "@/routes/client.routes";

async function refreshToken(token: JWT): Promise<JWT> {
  try {
    if (!token.backendTokens?.refreshToken) {
      // Retornar token con expiración para forzar logout
      return {
        ...token,
        backendTokens: {
          ...token.backendTokens,
          expiresIn: 0, // Fuerza logout al establecer expiración en 0
        },
      };
    }

    const res = await fetch(BACKEND_ROUTES.urlRefreshToken, {
      method: "POST",
      headers: {
        authorization: `Refresh ${token.backendTokens.refreshToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      // Retorna token con expiración 0 para forzar logout
      return {
        ...token,
        backendTokens: {
          ...token.backendTokens,
          expiresIn: 0,
        },
      };
    }

    const response = await res.json();

    if (!response.data || !response.data.accessToken) {
      return {
        ...token,
        backendTokens: {
          ...token.backendTokens,
          expiresIn: 0,
        },
      };
    }

    return {
      ...token,
      backendTokens: response.data,
    };
  } catch (error) {
    // Retorna token con expiración 0 para forzar logout
    return {
      ...token,
      backendTokens: {
        ...token.backendTokens,
        expiresIn: 0,
      },
    };
  }
}

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development", // ✅ Agregar logs en desarrollo
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "email", type: "text", placeholder: "user or email" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(BACKEND_ROUTES.urlLogin, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) {
            console.error("Login failed:", res.status);
            return null;
          }

          const loginResponse = await res.json();

          // ✅ Retornar estructura que NextAuth espera en el JWT callback
          // El servidor retorna: { user: {...}, backendTokens: {...} }
          // NextAuth espera que authorize() retorne el usuario + data extra
          return {
            ...loginResponse.user,
            backendTokens: loginResponse.backendTokens,
          };
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
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
      // expiresIn está en segundos desde el epoch de Unix
      const currentTime = Math.floor(new Date().getTime() / 1000);
      const tokenExpTime = token.backendTokens?.expiresIn;

      // Si el token está expirado, intentar refrescar
      if (tokenExpTime && currentTime >= tokenExpTime) {
        return await refreshToken(token);
      }

      // Token aún válido
      return token;
    },
    async session({ token, session }) {
      // Si el token está expirado (expiresIn = 0), devolver sesión vacía para forzar logout
      if (token.backendTokens?.expiresIn === 0) {
        return {
          ...session,
          user: token.user,
          backendTokens: {
            accessToken: "",
            refreshToken: "",
            expiresIn: 0,
          },
        };
      }

      session.user = token.user;
      session.backendTokens = token.backendTokens;
      return session;
    },
  },
};
