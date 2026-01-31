import { app } from './app';
import { bootstrapServer, kafkaWrapper } from '@logistream/shared';

bootstrapServer({
    app,
    port: Number(process.env.PORT) || 3001,
    requiredEnvVars: ['JWT_KEY', 'MONGO_URI'],
    onBeforeListen: async () => {
        // Initialize Kafka if needed
        if (process.env.KAFKA_BROKERS) {
            await kafkaWrapper.connect(
                'orders-service',
                process.env.KAFKA_BROKERS.split(',')
            );
        }
    },
});
