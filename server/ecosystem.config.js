module.exports = {
    apps: [
        {
            name: "server-asistencia",
            script: "./run.sh",
            interpreter: "bash",
            instances: 1,
            exec_mode: "fork",
            cwd: "./",
            watch: false,
            env: {
                NODE_ENV: "development"
            },
            env_production: {
                NODE_ENV: "production"
            }
        }
    ]
};
