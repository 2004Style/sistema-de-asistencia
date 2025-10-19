import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, LogIn, UserPlus, Fingerprint, Sparkles, Shield, Zap } from "lucide-react";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <div className="h-full flex flex-col justify-between">
      {/* Contenido principal */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-6xl w-full flex flex-col gap-4">
          {/* Hero Section */}
          <div className="text-center flex flex-col gap-4">
            <h2 className="text-5xl md:text-7xl font-bold text-foreground tracking-tight">
              Bienvenido a{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-chart-1 to-chart-2">
                Web Asistencia
              </span>
            </h2>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Gestiona el registro de asistencia de manera inteligente y segura.
            </p>
          </div>

          {/* Cards de opciones */}
          <div className="grid md:grid-cols-3 gap-6 ">
            {/* Card Iniciar Sesión */}
            <Card className="group hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 hover:border-primary/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <LogIn className="w-8 h-8 text-white" />
                </div>

                <div className="">
                  <h3 className="text-2xl font-bold text-foreground">
                    Iniciar Sesión
                  </h3>
                  <p className="text-muted-foreground">
                    Accede al panel de administración y gestiona el sistema
                  </p>
                </div>

                <Link href="/auth" className="block">
                  <Button
                    size="lg"
                    className="w-full text-base py-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg"
                  >
                    Ingresar
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Card Registro */}
            <Card className="group hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 hover:border-chart-1/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <UserPlus className="w-8 h-8 text-white" />
                </div>

                <div className="">
                  <h3 className="text-2xl font-bold text-foreground">
                    Crear Cuenta
                  </h3>
                  <p className="text-muted-foreground">
                    Regístrate en el sistema para comenzar a usar la plataforma
                  </p>
                </div>

                <Link href="/auth/register" className="block">
                  <Button
                    size="lg"
                    className="w-full text-base py-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg"
                  >
                    Registrarse
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Card Marcar Asistencia */}
            <Card className="group hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 hover:border-chart-2/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Fingerprint className="w-8 h-8 text-white" />
                </div>

                <div className="">
                  <h3 className="text-2xl font-bold text-foreground">
                    Marcar Asistencia
                  </h3>
                  <p className="text-muted-foreground">
                    Registra tu entrada o salida de forma rápida y segura
                  </p>
                </div>

                <Link href="/registro-asistencia" className="block">
                  <Button
                    size="lg"
                    className="w-full text-base py-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg"
                  >
                    Registrar
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />

      {/* Efectos decorativos */}
      <div className="fixed top-20 right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 left-20 w-96 h-96 bg-chart-2/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
