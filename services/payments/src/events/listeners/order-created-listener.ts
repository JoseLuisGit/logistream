import { EachMessagePayload } from 'kafkajs';
import { BaseListener, OrderCreatedEvent, Topics, OrderStatus } from '@logistream/shared';
import { Order } from '../../models/order';
import { queueGroupName } from './queue-group-name';

export class OrderCreatedListener extends BaseListener<OrderCreatedEvent> {
    topic: Topics.OrderCreated = Topics.OrderCreated;
    groupId = queueGroupName;

    async onMessage(data: OrderCreatedEvent['data'], msg: EachMessagePayload) {
        const order = Order.build({
            id: data.id,
            price: data.ticket.price,
            status: data.status,
            userId: data.userId,
            version: 0, // Simplified versioning
        });
        await order.save();
    }
}
