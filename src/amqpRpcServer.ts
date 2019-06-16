import * as amqp from 'amqplib';
import * as serializeError from 'serialize-error';
import { Subject } from 'rxjs';
import { error } from 'util';


type ProcessMessageDataFunc =  (data: any, subject: Subject<any>) => Promise<void>;

export class AmqpRpcServer {
    ampqUrl: string;
    ch: amqp.Channel | undefined;
    amqpQueueName: string;
    processMessageData: ProcessMessageDataFunc;
    
    constructor(amqpQueueName: string, processMessageData: ProcessMessageDataFunc, ampqUrl?: string) {
        if (ampqUrl !== undefined) {
            this.ampqUrl = ampqUrl;
        } else {
            if (process.env.RABBITMQ_HOSTNAME !== undefined) {
                this.ampqUrl = `amqp://${process.env.RABBITMQ_HOSTNAME}`;
            } else {
                this.ampqUrl = 'amqp://localhost';
            }
        }
        this.amqpQueueName = amqpQueueName;
        this.processMessageData = processMessageData;
    }
    
    async start(maxRetry?: number): Promise<boolean> {
        let conn: amqp.Connection | null = null;
        const timer = (ms: number)  => new Promise( res => setTimeout(res, ms));
        let connRetry = 0;
        while (conn === null) {
            try {
                connRetry +=1;
                console.log(`attempting to connect ${this.ampqUrl}`);
                conn = await amqp.connect(this.ampqUrl);
                console.log(`successful connection to ${this.ampqUrl}`);

            } catch (error) {
                console.log(`failed to connect ${this.ampqUrl}`); 
                if (maxRetry !== undefined && connRetry >= maxRetry) {
                    return false;
                } else {
                    await timer(5000);
                }
            }
        }
        this.ch = await conn.createChannel();
        this.ch.prefetch(1);
        await this.ch.assertQueue(this.amqpQueueName, {durable: false});
        await this.ch.consume(this.amqpQueueName, this.ampqReplay.bind(this));
        console.log(` [*] AMPQ Waiting for messages on queue "${this.amqpQueueName}"`);
        return true;
    }

    

    private async ampqReplay(msg: amqp.Message | null) {
        if (msg === null) {
            return;
        }
        if (!validChannel(this.ch)) {
            return;
        }
        this.ch.ack(msg);
        const replyTo: string = msg.properties.replyTo;
        const corrId: string = msg.properties.correlationId;
        const subject = new Subject();
        const isRequestingStream: boolean = msg.properties.headers.stream;
        subject.subscribe({
            next: (respData) => {
                this.sendBackData(replyTo, corrId, respData, 200, !isRequestingStream);
            },
            error: (err) => {
                this.sendBackData(replyTo, corrId, serializeError(err), 400, true);
            },
            complete: () => {
                if (isRequestingStream) {
                    this.sendBackData(replyTo, corrId, null, 204, true);
                }
            }
        });
        try {
            const reqData = JSON.parse(msg.content.toString());
            await this.processMessageData(reqData, subject);
        } catch(err) {
            console.error(serializeError(error));
            subject.unsubscribe();
            this.sendBackData(replyTo, corrId, serializeError(err), 400, true);
        }
    }

    private sendBackData(targetQueueName: string, corrId: string, data: any, status: number, endStream: boolean) {
        if (!validChannel(this.ch)) {
            return;
        };
        this.ch.sendToQueue(
            targetQueueName,
            Buffer.from(JSON.stringify(data)),
            {
                correlationId: corrId, 
                contentType: 'application/json',
                type: 'S2C',
                headers: {
                    status,
                    endStream
                }
            });
    }

    async close() {
        if (this.ch === undefined) {
            return;
        }
        await this.ch.close();
    }
}

function validChannel(ch: amqp.Channel | undefined): ch is amqp.Channel {
    if (ch === undefined) {
        throw new Error('channel is undefined');
    } 
    return true;
}