'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ReactNode } from 'react'

interface AnimatedCardProps {
    children: ReactNode
    delay?: number
    icon?: ReactNode
    title?: string
    description?: string
    onClick?: () => void
    className?: string
    gradientFrom?: string
    gradientTo?: string
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
    children,
    delay = 0,
    icon,
    title,
    description,
    onClick,
    className = '',
    gradientFrom = 'from-blue-500',
    gradientTo = 'to-blue-600'
}) => {
    const cardRef = useRef<HTMLDivElement>(null)
    const iconRef = useRef<HTMLDivElement>(null)
    const titleRef = useRef<HTMLHeadingElement>(null)
    const descriptionRef = useRef<HTMLParagraphElement>(null)
    const buttonRef = useRef<HTMLDivElement>(null)
    const glowRef = useRef<HTMLDivElement>(null)
    const borderLineRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const loadAnimationsAndExecute = async () => {
            if (!cardRef.current) return

            try {
                // Importar anime.js - en v4 exporta 'animate' como función principal
                const { animate } = await import('animejs')

                if (!animate || typeof animate !== 'function') {
                    console.error('anime.js no se cargó correctamente')
                    return
                }

                // Animación de entrada del card con estado inicial definido
                animate(
                    cardRef.current,
                    {
                        opacity: { from: 0, to: 1 },
                        scale: { from: 0.8, to: 1 },
                        duration: 800,
                        delay: delay,
                        easing: 'easeOutElastic(1, .75)'
                    }
                )

                // Animación del icono
                if (iconRef.current) {
                    animate(
                        iconRef.current,
                        {
                            opacity: { from: 0, to: 1 },
                            scale: { from: 0.5, to: 1 },
                            rotate: { from: 0, to: 360 },
                            duration: 1000,
                            delay: delay + 100,
                            easing: 'easeOutElastic(1, .6)'
                        }
                    )
                }

                // Animación del título
                if (titleRef.current) {
                    animate(
                        titleRef.current,
                        {
                            opacity: { from: 0, to: 1 },
                            translateX: { from: -20, to: 0 },
                            duration: 600,
                            delay: delay + 150,
                            easing: 'easeOutQuad'
                        }
                    )
                }

                // Animación de la descripción
                if (descriptionRef.current) {
                    animate(
                        descriptionRef.current,
                        {
                            opacity: { from: 0, to: 1 },
                            translateX: { from: -20, to: 0 },
                            duration: 600,
                            delay: delay + 200,
                            easing: 'easeOutQuad'
                        }
                    )
                }

                // Animación del botón
                if (buttonRef.current) {
                    animate(
                        buttonRef.current,
                        {
                            opacity: { from: 0, to: 1 },
                            translateY: { from: 20, to: 0 },
                            duration: 600,
                            delay: delay + 250,
                            easing: 'easeOutQuad'
                        }
                    )
                }

                // Animación del glow
                if (glowRef.current) {
                    animate(
                        glowRef.current,
                        {
                            opacity: { from: 0, to: 0.3 },
                            scale: { from: 0.8, to: 1 },
                            duration: 1000,
                            delay: delay + 300,
                            easing: 'easeOutQuad'
                        }
                    )
                }

                // Efectos hover
                const handleMouseEnter = () => {
                    if (!cardRef.current) return

                    // Animar icono en hover
                    if (iconRef.current) {
                        animate(
                            iconRef.current,
                            {
                                scale: [1, 1.15],
                                duration: 600,
                                easing: 'easeOutQuad'
                            }
                        )
                    }

                    // Animar glow en hover
                    if (glowRef.current) {
                        animate(
                            glowRef.current,
                            {
                                opacity: [0.3, 0.6],
                                scale: [1, 1.1],
                                duration: 500,
                                easing: 'easeOutQuad'
                            }
                        )
                    }

                    // Animar contenido en hover
                    const elements = cardRef.current?.querySelectorAll('[data-animate]')
                    if (elements && elements.length > 0) {
                        animate(
                            elements,
                            {
                                translateX: [0, 2],
                                translateY: [0, -2],
                                duration: 500,
                                easing: 'easeOutQuad'
                            }
                        )
                    }

                    // Animar borde en hover
                    if (borderLineRef.current) {
                        animate(
                            borderLineRef.current,
                            {
                                opacity: [0, 1],
                                duration: 600,
                                easing: 'easeOutQuad'
                            }
                        )
                    }
                }

                const handleMouseLeave = () => {
                    if (!cardRef.current) return

                    // Restaurar icono
                    if (iconRef.current) {
                        animate(
                            iconRef.current,
                            {
                                scale: 1,
                                duration: 400,
                                easing: 'easeOutQuad'
                            }
                        )
                    }

                    // Restaurar glow
                    if (glowRef.current) {
                        animate(
                            glowRef.current,
                            {
                                opacity: 0.3,
                                scale: 1,
                                duration: 400,
                                easing: 'easeOutQuad'
                            }
                        )
                    }

                    // Restaurar contenido
                    const elements = cardRef.current?.querySelectorAll('[data-animate]')
                    if (elements && elements.length > 0) {
                        animate(
                            elements,
                            {
                                translateX: 0,
                                translateY: 0,
                                duration: 400,
                                easing: 'easeOutQuad'
                            }
                        )
                    }

                    // Restaurar borde
                    if (borderLineRef.current) {
                        animate(
                            borderLineRef.current,
                            {
                                opacity: [1, 0],
                                duration: 400,
                                easing: 'easeOutQuad'
                            }
                        )
                    }
                }

                // Agregar listeners
                if (cardRef.current) {
                    cardRef.current.addEventListener('mouseenter', handleMouseEnter)
                    cardRef.current.addEventListener('mouseleave', handleMouseLeave)

                    return () => {
                        if (cardRef.current) {
                            cardRef.current.removeEventListener('mouseenter', handleMouseEnter)
                            cardRef.current.removeEventListener('mouseleave', handleMouseLeave)
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading anime.js:', error)
            }
        }

        const cleanup = loadAnimationsAndExecute()

        return () => {
            cleanup?.then(fn => fn?.())
        }
    }, [delay])

    return (
        <div
            ref={cardRef}
            onClick={onClick}
            className={`relative flex-1 min-w-92 max-w-96 bg-card border border-border rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group ${className}`}
            style={{
                opacity: 0,
                transform: 'scale(0.8)'
            }}
        >
            {/* Glow de fondo animado */}
            <div
                ref={glowRef}
                className={`absolute inset-0 bg-linear-to-br ${gradientFrom} ${gradientTo} opacity-10 rounded-2xl pointer-events-none blur-2xl`}
                style={{
                    opacity: 0,
                    transform: 'scale(0.8)'
                }}
            />

            {/* Borde animado con gradiente */}
            <div
                ref={borderLineRef}
                className={`absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent opacity-0 rounded-2xl pointer-events-none`}
            />

            {/* Contenido */}
            <div className="relative p-8 text-center space-y-6 z-10">
                {/* Icono */}
                {icon && (
                    <div
                        ref={iconRef}
                        data-animate
                        className={`mx-auto w-16 h-16 bg-linear-to-br ${gradientFrom} ${gradientTo} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}
                        style={{
                            opacity: 0,
                            transform: 'scale(0.5)'
                        }}
                    >
                        {icon}
                    </div>
                )}

                {/* Título y descripción */}
                {title && (
                    <h3
                        ref={titleRef}
                        data-animate
                        className="text-2xl font-bold text-foreground"
                        style={{
                            opacity: 0,
                            transform: 'translateX(-20px)'
                        }}
                    >
                        {title}
                    </h3>
                )}

                {description && (
                    <p
                        ref={descriptionRef}
                        data-animate
                        className="text-muted-foreground line-clamp-2"
                        style={{
                            opacity: 0,
                            transform: 'translateX(-20px)'
                        }}
                    >
                        {description}
                    </p>
                )}

                {/* Botón/Contenido adicional */}
                {children && (
                    <div
                        ref={buttonRef}
                        data-animate
                        style={{
                            opacity: 0,
                            transform: 'translateY(20px)'
                        }}
                    >
                        {children}
                    </div>
                )}
            </div>
        </div>
    )
}
