import { Kafka } from 'kafkajs';

class KafkaWrapper {
    private _client?: Kafka;

    get client() {
        if (!this._client) {
            throw new Error('Cannot access Kafka client before connecting');
        }
        return this._client;
    }

    connect(clientId: string, brokers: string[]): Promise<void> {
        this._client = new Kafka({
            clientId,
            brokers,
        });
        return Promise.resolve();
    }
}

export const kafkaWrapper = new KafkaWrapper();
