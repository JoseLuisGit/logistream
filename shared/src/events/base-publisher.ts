import { Kafka, Producer, RecordMetadata } from 'kafkajs';
import { Event } from './base-event';
import { logger } from '../logger';

export abstract class BasePublisher<T extends Event> {
    abstract topic: T['topic'];
    private producer: Producer;

    constructor(client: Kafka) {
        this.producer = client.producer();
    }

    async publish(data: T['data']): Promise<RecordMetadata[]> {
        await this.producer.connect();

        try {
            const result = await this.producer.send({
                topic: this.topic,
                messages: [
                    {
                        value: JSON.stringify(data),
                    },
                ],
            });
            logger.info(`Event published to topic ${this.topic}`);
            return result;
        } catch (err) {
            logger.error('Error publishing event:', err);
            throw err;
        } finally {
            await this.producer.disconnect();
        }
    }
}
