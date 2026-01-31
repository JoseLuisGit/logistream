import { BasePublisher, OrderCancelledEvent, Topics } from '@logistream/shared';

export class OrderCancelledPublisher extends BasePublisher<OrderCancelledEvent> {
    topic: Topics.OrderCancelled = Topics.OrderCancelled;
}
