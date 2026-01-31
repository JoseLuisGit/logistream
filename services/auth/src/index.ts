import mongoose from 'mongoose';
import { app } from './app';
import { logger } from '@logistream/shared';

const start = async () => {
    if (!process.env.JWT_KEY) {
        throw new Error('JWT_KEY must be defined');
    }
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI must be defined');
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        logger.info('Connected to MongoDb');
    } catch (err) {
        logger.error(err);
    }

    app.listen(3000, () => {
        logger.info('Listening on port 3000');
    });
};

start();
