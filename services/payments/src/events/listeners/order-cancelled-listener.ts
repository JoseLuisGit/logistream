import { EachMessagePayload } from 'kafkajs';
import { OrderCancelledEvent, Topics, BaseListener, OrderStatus } from '@logistream/shared';
import { Order } from '../../models/order';
import { queueGroupName } from './queue-group-name';

export class OrderCancelledListener extends BaseListener<OrderCancelledEvent> {
    topic: Topics.OrderCancelled = Topics.OrderCancelled;
    groupId = queueGroupName;

    async onMessage(data: OrderCancelledEvent['data'], msg: EachMessagePayload) {
        const order = await Order.findOne({
            _id: data.id,
        });

        if (!order) {
            throw new Error('Order not found');
        }

        order.set({ status: OrderStatus.Cancelled });
        await order.save();
    }
}
