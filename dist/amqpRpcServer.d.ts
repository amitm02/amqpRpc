import * as amqp from 'amqplib';
export declare class AmqpRpcServer {
    ampqUrl: string;
    ch: amqp.Channel | undefined;
    amqpQueueName: string;
    processMessageData: (data: any) => Promise<any>;
    constructor(amqpQueueName: string, processMessageData: (data: any) => Promise<any>, ampqUrl?: string);
    start(maxRetry?: number): Promise<boolean>;
    close(): void;
    private ampqReplay;
    private sendBackData;
}
