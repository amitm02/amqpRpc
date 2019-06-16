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
    send(targetQueueName: string, data: any, stream?: boolean): Observable<Message>;
    private handleMessage;
    flush(): Promise<void>;
    close(): void;
}
export {};
