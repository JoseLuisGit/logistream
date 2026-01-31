import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { Event } from './base-event';
import { logger } from '../logger';

export abstract class BaseListener<T extends Event> {
    abstract topic: T['topic'];
    abstract groupId: string;
    private consumer?: Consumer;

    constructor(protected client: Kafka) { }

    async listen() {
        this.consumer = this.client.consumer({ groupId: this.groupId });

        await this.consumer.connect();
        await this.consumer.subscribe({ topic: this.topic, fromBeginning: true });

        await this.consumer.run({
            eachMessage: async (payload: EachMessagePayload) => {
                const { topic, partition, message } = payload;
                logger.info(
                    `Message received: ${topic} / ${partition} / ${message.offset}`
                );

                const parsedData = this.parseMessage(message);
                await this.onMessage(parsedData, payload);
            },
        });
    }

    abstract onMessage(data: T['data'], payload: EachMessagePayload): Promise<void>;

    parseMessage(message: any) {
        const data = message.value;
        return typeof data === 'string'
            ? JSON.parse(data)
            : JSON.parse(data.toString('utf8'));
    }
}
