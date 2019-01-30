import * as amqp from 'amqplib';
export declare class AmqpRpcClient {
    ampqUrl: string;
    ch: amqp.Channel | undefined;
    respondQueueName: string | undefined;
    pendingRequests: {
        [corrId: string]: ({ body: any, status: number }: {
            body: any;
            status: any;
        }) => void;
    };
    constructor(ampqUrl?: string);
    private init;
    private handleMessage;
    send(targetQueueName: string, data: any): Promise<{
        body: any;
        status: number;
    }>;
    flush(): Promise<void>;
    close(): void;
}
