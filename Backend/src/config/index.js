import 'dotenv/config';

const config = {
    port: process.env.PORT || 5000,
    databaseUrl: process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    jwtSecret: process.env.JWT_SECRET || 'hubconnect-dev-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
    isSupabase: (process.env.DATABASE_URL || '').includes('supabase'),
};

if (config.nodeEnv === 'production' && config.jwtSecret === 'hubconnect-dev-secret-change-in-production') {
    console.error('FATAL: JWT_SECRET must be set in production!');
    process.exit(1);
}

if (!config.databaseUrl) {
    console.error('FATAL: DATABASE_URL environment variable is required.');
    process.exit(1);
}

export default config;
