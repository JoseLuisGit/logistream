import { BasePublisher, OrderCreatedEvent, Topics } from '@logistream/shared';

export class OrderCreatedPublisher extends BasePublisher<OrderCreatedEvent> {
    topic: Topics.OrderCreated = Topics.OrderCreated;
}
