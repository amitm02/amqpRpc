import * as amqp from 'amqplib';
import { ReplaySubject, Observable } from 'rxjs';
interface Message {
    body: any;
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
    sendAndAccepctPromise(targetQueueName: string, data: any): Promise<Message>;
    sendAndAccepctStream(targetQueueName: string, data: any): Observable<Message>;
    private send;
    private handleMessage;
    flush(): Promise<void>;
    close(): Promise<void>;
}
export {};
