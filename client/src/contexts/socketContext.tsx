/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { BACKEND_ROUTES } from '@/routes/backend.routes';
import { useSession } from 'next-auth/react';

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => {
    return useContext(SocketContext);
};

interface SocketProviderProps {
    children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const { data: session } = useSession();
    useEffect(() => {
        if (socket) {
            socket.disconnect();
        }
        const idUser = session?.user?.name === "" ? "invitado" : session?.user?.name;

        // 🟢 Crear nueva conexión
        const newSocket = io(BACKEND_ROUTES.urlSockets, {
            path: "/socket.io/",
            // query: { id: idUser }
        });

        setSocket(newSocket);

        return () => {
            // 🔴 Cerrar la conexión cuando el componente se desmonte o `user` cambie
            newSocket.disconnect();
        };
        // }, [session]); // Se ejecuta cuando `user` cambia
    }, [session]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
