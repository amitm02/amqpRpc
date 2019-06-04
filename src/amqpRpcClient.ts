import * as amqp from 'amqplib';
import { v4 as uuid } from 'uuid';

export class AmqpRpcClient {
    ampqUrl: string;
    ch: amqp.Channel | undefined;
    respondQueueName: string | undefined;
    // @ts-ignore
    pendingRequests: { [corrId: string]: ({body: any, status: number}) => void } = {}; 

    
    constructor(ampqUrl?: string) {
        if (ampqUrl !== undefined) {
            this.ampqUrl = ampqUrl;
        } else {
            if (process.env.RABBITMQ_HOSTNAME !== undefined) {
                this.ampqUrl = `amqp://${process.env.RABBITMQ_HOSTNAME}`;
            } else {
                this.ampqUrl = 'amqp://localhost';
            }
        }
    }

    async init(maxRetry?: number): Promise<boolean> {
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
        const assertQueueResp = await this.ch.assertQueue('', { exclusive: true });
        this.respondQueueName = assertQueueResp.queue;
        this.ch.consume(this.respondQueueName, this.handleMessage.bind(this), { noAck: true });
        return true;
    }

   private handleMessage(msg: amqp.Message | null): void {
        if (msg === null) {
            return;
        }
        const resolveFunc = this.pendingRequests[msg.properties.correlationId];
        if (resolveFunc === undefined) {
            return;
        }
        delete this.pendingRequests[msg.properties.correlationId];
        const body = JSON.parse(msg.content.toString());
        resolveFunc({
            body,
            status: msg.properties.headers['status']
        });
    }

    send(targetQueueName: string, data: any): Promise<{ body: any, status: number }> {
        
        const corrId = uuid();
        return new Promise((resolve, error) => {
            if (this.ch === undefined) {
                error('server is not initilized yet');
                return;
            }
            this.pendingRequests[corrId] = resolve;
            this.ch.sendToQueue(targetQueueName,
                Buffer.from(JSON.stringify(data)),
                {
                    correlationId: corrId,
                    replyTo: this.respondQueueName,
                    contentType: 'application/json'
                }
            );
        });
    }

    async flush() {
        if (this.ch === undefined || this.respondQueueName === undefined) {
            throw new Error('server is not initilized yet');
        }
        this.ch.ackAll();
        await this.ch.purgeQueue(this.respondQueueName);
        this.pendingRequests = {};
    }

    close() {
        if (this.ch === undefined) {
            return;
        }
        this.ch.close();
    }
}