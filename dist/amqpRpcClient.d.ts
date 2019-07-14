import * as amqp from 'amqplib';
import { ReplaySubject, Observable } from 'rxjs';
declare type Message<T = any> = {
    body: T;
    status: 200;
} | {
    body: any;
    status: 400 | 500 | 404;
};
export declare class AmqpRpcClient {
    ampqUrl: string;
    ch: amqp.Channel | undefined;
    respondQueueName: string | undefined;
    pendingRequests: {
        [corrId: string]: ReplaySubject<Message>;
    };
    constructor(ampqUrl?: string);
    init(maxRetry?: number): Promise<boolean>;
    sendAndAcceptPromise<T = any>(targetQueueName: string, data: any): Promise<Message<T>>;
    sendAndAcceptStream<T = any>(targetQueueName: string, data: any): Observable<Message<T>>;
    private send;
    private handleMessage;
    flush(): Promise<void>;
    close(): Promise<void>;
}
export {};
