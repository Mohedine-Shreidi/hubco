import postgres from 'postgres';
import config from '../config/index.js';

/**
 * Postgres SQL client.
 * `postgres` driver uses tagged-template literals for safe parameterisation.
 * Connection is lazy — first query triggers the actual TCP connect.
 */
const sql = postgres(config.databaseUrl, {
    max: 10,           // max pool size
    idle_timeout: 30,  // idle connection closed after 30s
    connect_timeout: 10,
    onnotice: (notice) => {
        if (config.nodeEnv === 'development') console.info('[DB notice]', notice.message);
    },
});

export default sql;
