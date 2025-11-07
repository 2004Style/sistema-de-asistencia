import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import { AuthorizeResponse } from "./next-auth";
import { BACKEND_ROUTES } from "@/routes/backend.routes";
import { CLIENT_ROUTES } from "@/routes/client.routes";

async function refreshToken(token: JWT): Promise<JWT> {
  try {
    if (!token.backendTokens?.refreshToken) {
      console.error("❌ No hay refresh token disponible");
      // Retornar token con expiración para forzar logout
      return {
        ...token,
        backendTokens: {
          ...token.backendTokens,
          expiresIn: 0, // Fuerza logout al establecer expiración en 0
        },
      };
    }

    console.log("🔄 Intentando refrescar token...");

    const res = await fetch(BACKEND_ROUTES.urlRefreshToken, {
      method: "POST",
      headers: {
        authorization: `Refresh ${token.backendTokens.refreshToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error(`❌ Error al refrescar token: ${res.status} ${res.statusText}`);
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
      console.error("❌ Respuesta de refresh inválida:", response);
      return {
        ...token,
        backendTokens: {
          ...token.backendTokens,
          expiresIn: 0,
        },
      };
    }

    console.log("✅ Token refrescado exitosamente");

    return {
      ...token,
      backendTokens: response.data,
    };
  } catch (error) {
    console.error("❌ Error en refreshToken:", error);
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
        console.log("👤 Usuario logueado, generando JWT...");
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

      console.log(`⏰ Verificando expiración del token:`, {
        currentTime,
        tokenExpTime,
        isExpired: tokenExpTime ? currentTime >= tokenExpTime : "no hay expiración",
      });

      // Si el token está expirado, intentar refrescar
      if (tokenExpTime && currentTime >= tokenExpTime) {
        console.log("⚠️ Token expirado, intentando refrescar...");
        return await refreshToken(token);
      }

      // Token aún válido
      return token;
    },
    async session({ token, session }) {
      // Si el token está expirado (expiresIn = 0), devolver sesión vacía para forzar logout
      if (token.backendTokens?.expiresIn === 0) {
        console.log("🚪 Token expirado, forzando logout...");
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
