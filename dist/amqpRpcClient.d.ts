import * as amqp from 'amqplib';
import { ReplaySubject, Observable } from 'rxjs';
interface Message<T> {
    body: T;
    status: number;
}
export declare class AmqpRpcClient {
    ampqUrl: string;
    ch: amqp.Channel | undefined;
    respondQueueName: string | undefined;
    pendingRequests: {
        [corrId: string]: ReplaySubject<Message>;
    };
    constructor(ampqUrl?: string);
    init(maxRetry?: number): Promise<boolean>;
    sendAndAcceptPromise<T>(targetQueueName: string, data: any): Promise<Message<T>>;
    sendAndAcceptStream<T>(targetQueueName: string, data: any): Observable<Message<T>>;
    private send;
    private handleMessage;
    flush(): Promise<void>;
    close(): Promise<void>;
}
export {};
