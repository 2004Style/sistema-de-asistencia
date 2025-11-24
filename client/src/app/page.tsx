"use client"
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus, Fingerprint } from "lucide-react";
import { Footer } from "@/components/footer";
import { useSession } from "next-auth/react";
import { AnimatedCard } from "@/components/AnimatedCard";
import "./home.css"
import BlurText from "@/components/react-beats/BlurText/ShinyText";
import { SplitText } from "@/components/react-beats/SplitText/SplitText";

export default function Home() {
  const { status } = useSession();

  if (status === "loading") {
    return <></>
  }


  return (
    <div className="flex flex-1 flex-col justify-between">
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
                <AnimatedCard
                  delay={100}
                  icon={<LogIn className="w-8 h-8 text-white" />}
                  title="Iniciar Sesión"
                  description="Accede al panel de administración y gestiona el sistema"
                  gradientFrom="from-blue-500"
                  gradientTo="to-blue-600"
                >
                  <Link href="/auth" className="block">
                    <Button
                      size="lg"
                      className="w-full text-base py-6 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg"
                    >
                      Ingresar
                    </Button>
                  </Link>
                </AnimatedCard>

                {/* Card Registro */}
                <AnimatedCard
                  delay={200}
                  icon={<UserPlus className="w-8 h-8 text-white" />}
                  title="Crear Cuenta"
                  description="Regístrate en el sistema para comenzar a usar la plataforma"
                  gradientFrom="from-amber-500"
                  gradientTo="to-orange-600"
                >
                  <Link href="/auth/register" className="block">
                    <Button
                      size="lg"
                      className="w-full text-base py-6 bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg"
                    >
                      Registrarse
                    </Button>
                  </Link>
                </AnimatedCard>

              </>
            }


            {/* Card Marcar Asistencia */}
            <AnimatedCard
              delay={300}
              icon={<Fingerprint className="w-8 h-8 text-white" />}
              title="Marcar Asistencia"
              description="Registra tu entrada o salida de forma rápida y segura"
              gradientFrom="from-emerald-500"
              gradientTo="to-teal-600"
            >
              <Link href="/registro-asistencia" className="block">
                <Button
                  size="lg"
                  className="w-full text-base py-6 bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg"
                >
                  Registrar
                </Button>
              </Link>
            </AnimatedCard>
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
