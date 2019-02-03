import * as amqp from 'amqplib';
import * as serializeError from 'serialize-error';



export class AmqpRpcServer {
    ampqUrl: string;
    ch: amqp.Channel | undefined;
    amqpQueueName: string;
    processMessageData: (data: any) => Promise<any>;
    
    constructor(amqpQueueName: string, processMessageData: (data: any) => Promise<any>, ampqUrl?: string) {
        if (ampqUrl !== undefined) {
            this.ampqUrl = ampqUrl;
        } else {
            this.ampqUrl = 'amqp://localhost';
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
                await timer(2000);
                if (maxRetry !== undefined && connRetry >= maxRetry) {
                    return false;
                }
            }
        }
        this.ch = await conn.createChannel();
        this.ch.prefetch(1);
        await this.ch.assertQueue(this.amqpQueueName, {durable: false});
        await this.ch.consume(this.amqpQueueName, this.ampqReplay.bind(this));
        console.log(' [*] AMPQ Waiting for messages');
        return true;
    }

    close() {
        if (this.ch === undefined) {
            return;
        }
        this.ch.close();
    }

    private async ampqReplay(msg: amqp.Message | null) {
        if (msg === null) {
            return;
        }
        if (this.ch === undefined) {
            throw new Error('channel is undefined');
        }
        const replayTo = msg.properties.replyTo;
        const corrId = msg.properties.correlationId;
        try {
            const reqData = JSON.parse(msg.content.toString());
            const respData = await this.processMessageData(reqData);
            this.sendBackData(replayTo, corrId, respData, 200);
            this.ch.ack(msg);
        } catch(error) {
            this.sendBackData(replayTo, corrId, serializeError(error), 400);
            this.ch.nack(msg, false, false);
            return;
        }
    }

    private sendBackData(targetQueueName: string, corrId: string, data: any, status: number) {
        if (this.ch === undefined) {
            throw new Error('channel is undefined');
        }
        this.ch.sendToQueue(
            targetQueueName,
            Buffer.from(JSON.stringify(data)),
            {
                correlationId: corrId, 
                contentType: 'application/json',
                headers: {status}
            });
    }
}
