import { Topics, PaymentCreatedEvent, BasePublisher } from '@logistream/shared';

export class PaymentCreatedPublisher extends BasePublisher<PaymentCreatedEvent> {
    topic: Topics.PaymentCreated = Topics.PaymentCreated;
}
