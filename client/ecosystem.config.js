module.exports = {
    apps: [
        {
            // ==================== APLICACIÓN PRINCIPAL ====================
            name: "client-asistencia",
            script: "./node_modules/next/dist/bin/next",
            args: "start",
            interpreter: "node",

            // ==================== MODO CLUSTER ====================
            // instances: 1 = Una sola instancia
            // instances: "max" = Una por cada CPU (descomenta si necesitas más)
            instances: 1,
            exec_mode: "fork",  // "fork" para 1 instancia, "cluster" para múltiples

            // ==================== CONFIGURACIÓN DE RED ====================
            // Escucha en todas las interfaces (0.0.0.0) para acceder desde cualquier laptop
            env: {
                NODE_ENV: "production",
                HOST: "0.0.0.0",
                PORT: 3000,
            },
            env_production: {
                NODE_ENV: "production",
                HOST: "0.0.0.0",
                PORT: 3000,
            },

            // ==================== REINICIO AUTOMÁTICO ====================
            // Reinicia si la app se cae
            autorestart: true,
            // Máximo de intentos de reinicio antes de detener
            max_restarts: 10,
            // Tiempo entre reintentos (en ms)
            min_uptime: "10s",
            max_memory_restart: "500M",

            // ==================== VIGILANCIA DE CAMBIOS ====================
            // Reinicia cuando hay cambios en archivos (mejor en desarrollo)
            watch: false,
            // Ignorar carpetas y archivos
            ignore_watch: [
                "node_modules",
                ".next",
                ".git",
                "public",
                "dist",
                "coverage",
                "pnpm-lock.yaml",
            ],
            // Retraso antes de reiniciar (en ms) - evita múltiples reinicios
            watch_delay: 1000,

            // ==================== LOGS ====================
            // Ubicación de logs
            out_file: "logs/out.log",
            error_file: "logs/error.log",
            // Combina logs de todos los workers
            merge_logs: true,
            // Prefija logs con timestamp
            time: true,

            // ==================== SEÑALES DE CONTROL ====================
            // Tipo de señal para kill
            kill_timeout: 5000,
            wait_ready: false,
            listen_timeout: 3000,
            shutdown_with_message: false,

            // ==================== OTROS ====================
            // No inicia con PM2 en background
            no_daemon: false,
            // Prefijo para el nombre de los logs
            append_env_to_name: true,
        },
    ],

    // ==================== CONFIGURACIÓN GENERAL ====================
    deploy: {
        production: {
            user: "node",
            host: "your.host.com",
            ref: "origin/main",
            repo: "git@github.com:repo.git",
            path: "/var/www/app",
            "post-deploy":
                "npm install && npm run build && pm2 reload ecosystem.config.js --env production",
        },
    },
};
