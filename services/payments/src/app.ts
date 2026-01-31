import { createExpressApp, currentUser } from '@logistream/shared';
import { createChargeRouter } from './routes/new';

export const app = createExpressApp({
    routers: [
        currentUser,
        createChargeRouter,
    ],
});
