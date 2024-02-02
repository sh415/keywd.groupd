module.exports = {
    apps: [
        {
            name: 'keywd',
            script: './app.js',
            instance_var: 'INSTANCE_ID',
            // instance: 0,
            instances: 1,
            exec_mode: 'cluster',
            marge_logs: true,
            autorestart: false,
            watch: false,
            // max_memory_restart: '1024',
            env: {
                NODE_ENV: 'production',
                PORT: 5055,
            },
        }
    ]
};