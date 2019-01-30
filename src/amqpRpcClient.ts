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
            this.ampqUrl = 'amqp://localhost';
        }
        this.init();
        
    }
    private async init() {
        const conn = await amqp.connect(this.ampqUrl);
        this.ch = await conn.createChannel();
        const assertQueueResp = await this.ch.assertQueue('', { exclusive: true });
        this.respondQueueName = assertQueueResp.queue;
        this.ch.consume(this.respondQueueName, this.handleMessage.bind(this), { noAck: true });
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