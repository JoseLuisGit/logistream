import { createExpressApp } from '@logistream/shared';
import { signupRouter } from './routes/signup';
import { signinRouter } from './routes/signin';
import { signoutRouter } from './routes/signout';
import { currentUserRouter } from './routes/current-user';

export const app = createExpressApp({
    routers: [
        currentUserRouter,
        signupRouter,
        signinRouter,
        signoutRouter,
    ],
});
