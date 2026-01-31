import mongoose from 'mongoose';
import { Express } from 'express';
import { logger } from './logger';

interface BootstrapConfig {
    app: Express;
    port: number;
    requiredEnvVars: string[];
    onBeforeListen?: () => Promise<void>;
}

export async function bootstrapServer(config: BootstrapConfig): Promise<void> {
    // Validate environment variables
    validateEnvironment(config.requiredEnvVars);

    // Connect to MongoDB
    await connectToDatabase();

    // Custom initialization (e.g., Kafka, listeners)
    if (config.onBeforeListen) {
        await config.onBeforeListen();
    }

    // Start HTTP server
    config.app.listen(config.port, () => {
        logger.info(`Listening on port ${config.port}`);
    });
}

function validateEnvironment(requiredVars: string[]): void {
    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}`
        );
    }
}

async function connectToDatabase(): Promise<void> {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI must be defined');
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        logger.info('Connected to MongoDB');
    } catch (err) {
        logger.error('MongoDB connection error:', err);
        throw err;
    }
}
