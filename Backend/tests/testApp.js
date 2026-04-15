/**
 * Minimal test application — no listen(), no socket.io.
 * Used by security tests via supertest.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import routes from '../src/routes/index.js';
import errorHandler from '../src/middleware/errorHandler.js';

const testApp = express();

testApp.use(helmet());
testApp.use(cors({ origin: '*' }));
testApp.use(express.json({ limit: '10mb' }));
testApp.use(express.urlencoded({ extended: true }));

testApp.get('/health', (_req, res) => res.json({ status: 'ok' }));

testApp.use('/api', routes);
testApp.use(errorHandler);

export default testApp;
