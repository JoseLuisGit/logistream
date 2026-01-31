import { createExpressApp, currentUser } from '@logistream/shared';
import { newOrderRouter } from './routes/new';
import { showOrderRouter } from './routes/show';
import { indexOrderRouter } from './routes/index';
import { deleteOrderRouter } from './routes/delete';
import { createTicketRouter } from './routes/new-ticket';

export const app = createExpressApp({
    routers: [
        currentUser,
        createTicketRouter,
        newOrderRouter,
        showOrderRouter,
        indexOrderRouter,
        deleteOrderRouter,
    ],
});
