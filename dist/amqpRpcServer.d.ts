import * as amqp from 'amqplib';
import { Subject } from 'rxjs';
declare type ProcessMessageDataFunc = (data: any, subject: Subject<any>) => Promise<void>;
export declare class AmqpRpcServer {
    ampqUrl: string;
    ch: amqp.Channel | undefined;
    amqpQueueName: string;
    processMessageData: ProcessMessageDataFunc;
    constructor(amqpQueueName: string, processMessageData: ProcessMessageDataFunc, ampqUrl?: string);
    start(maxRetry?: number): Promise<boolean>;
    private ampqReplay;
    private sendBackData;
    close(): Promise<void>;
}
export {};
