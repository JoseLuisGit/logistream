import { app } from './app';
import { bootstrapServer } from '@logistream/shared';

bootstrapServer({
    app,
    port: Number(process.env.PORT) || 3000,
    requiredEnvVars: ['JWT_KEY', 'MONGO_URI'],
});
