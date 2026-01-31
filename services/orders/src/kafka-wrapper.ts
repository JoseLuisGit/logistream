import { Kafka } from 'kafkajs';

class KafkaWrapper {
    private _client?: Kafka;

    get client() {
        if (!this._client) {
            throw new Error('Cannot access Kafka client before connecting');
        }
        return this._client;
    }

    connect(clientId: string, brokers: string[]) {
        this._client = new Kafka({
            clientId,
            brokers,
        });

        // We can also connect a producer here if we want a shared one, 
        // but BasePublisher creates its own producer usually. 
        // For optimization, we might want to share the producer connection, 
        // but sticking to the BasePublisher pattern for now.

        return Promise.resolve();
    }
}

export const kafkaWrapper = new KafkaWrapper();
