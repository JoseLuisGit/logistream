import express, { Router, RequestHandler } from 'express';
import 'express-async-errors';
import { json } from 'body-parser';
import cookieSession from 'cookie-session';
import { errorHandler } from './middlewares/error-handler';
import { NotFoundError } from './errors/not-found-error';

interface AppConfig {
    routers: (Router | RequestHandler)[];
    enableCookieSession?: boolean;
}

export function createExpressApp(config: AppConfig) {
    const app = express();

    // Common middleware
    app.set('trust proxy', true);
    app.use(json());

    // Cookie session (all services use it)
    if (config.enableCookieSession !== false) {
        app.use(
            cookieSession({
                signed: false,
                secure: process.env.NODE_ENV === 'production',
            })
        );
    }

    // Mount service-specific routers and middleware
    config.routers.forEach(router => app.use(router));

    // 404 handler
    app.all('*', async (req, res) => {
        throw new NotFoundError();
    });

    // Error handler
    app.use(errorHandler);

    return app;
}
