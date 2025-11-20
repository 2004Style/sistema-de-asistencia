"use client"
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn, UserPlus, Fingerprint } from "lucide-react";
import { Footer } from "@/components/footer";
import { useSession } from "next-auth/react";
import "./home.css"
import BlurText from "@/components/react-beats/BlurText/ShinyText";
import { SplitText } from "@/components/react-beats/SplitText/SplitText";
export default function Home() {
  const { status } = useSession();

  if (status === "loading") {
    return <></>
  }


  return (
    <div className="h-full flex flex-col justify-between">
      {/* Contenido principal */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-6xl w-full flex flex-col gap-4">
          {/* Hero Section */}
          <div className="text-center flex flex-col gap-4">
            <BlurText
              text="Bienvenido a Web Asistencia"
              delay={150}
              animateBy="words"
              direction="top"
              className="text-5xl md:text-7xl font-bold text-center flex justify-center items-center"
            />

            <SplitText
              text="Gestiona el registro de asistencia de manera inteligente y segura."
              className="text-2xl text-center"
              delay={20}
              duration={0.6}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 40 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.1}
              rootMargin="-100px"
              textAlign="center"
            />
          </div>

          {/* Cards de opciones */}
          <div className="flex items-center justify-center flex-wrap gap-6 ">
            {status === "unauthenticated" &&
              <>
                {/* Card Iniciar Sesión */}
              <Card className="flex-1 min-w-[23rem] max-w-[24rem] group card_home">
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
              <Card className="flex-1 min-w-[23rem] max-w-[24rem] group card_home">
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

              </>
            }


            {/* Card Marcar Asistencia */}
            <Card className="flex-1 min-w-[23rem] max-w-[24rem] group card_home">
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
    </div >
  );
}
