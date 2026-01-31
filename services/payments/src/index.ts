import { app } from './app';
import { bootstrapServer, kafkaWrapper } from '@logistream/shared';
import { OrderCreatedListener } from './events/listeners/order-created-listener';
import { OrderCancelledListener } from './events/listeners/order-cancelled-listener';

bootstrapServer({
    app,
    port: Number(process.env.PORT) || 3002,
    requiredEnvVars: ['JWT_KEY', 'MONGO_URI', 'STRIPE_KEY'],
    onBeforeListen: async () => {
        // Initialize Kafka
        if (process.env.KAFKA_BROKERS) {
            await kafkaWrapper.connect(
                'payments-service',
                process.env.KAFKA_BROKERS.split(',')
            );

            // Start listeners
            await new OrderCreatedListener(kafkaWrapper.client).listen();
            await new OrderCancelledListener(kafkaWrapper.client).listen();
        }
    },
});
