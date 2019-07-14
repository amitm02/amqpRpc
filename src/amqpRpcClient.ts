import * as amqp from 'amqplib';
import { v4 as uuid } from 'uuid';
import { ReplaySubject, Observable } from 'rxjs';



type Message<T=any> =  {body: T, status: 200} | {body: any, status:400|500|404} ;

export class AmqpRpcClient {
    ampqUrl: string;
    ch: amqp.Channel | undefined;
    respondQueueName: string | undefined;
    // @ts-ignore

    
    pendingRequests: { [corrId: string]: ReplaySubject<Message> } = {}; 

    
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
        const assertQueueResp = await this.ch.assertQueue('', { 
            exclusive: true,
            autoDelete: true
        });
        this.respondQueueName = assertQueueResp.queue;
        this.ch.consume(this.respondQueueName, this.handleMessage.bind(this), { noAck: true });
        return true;
    }

    sendAndAcceptPromise<T=any>(targetQueueName: string, data: any): Promise<Message<T>> {
        return this.send<T>(targetQueueName, data, false).toPromise();
    }

    sendAndAcceptStream<T=any>(targetQueueName: string, data: any): Observable<Message<T>> {
        return this.send<T>(targetQueueName, data, true);
    }

    //make to to complete the subject
    private send<T=any>(targetQueueName: string, data: any, stream = false): Observable<Message<T>> {   
        if (this.ch === undefined) {
            throw new Error('server is not initilized yet');
        }     
        const corrId = uuid();
        const subject = new ReplaySubject<Message<T>>();
        this.pendingRequests[corrId] = subject;
        this.ch.sendToQueue(targetQueueName,
            Buffer.from(JSON.stringify(data)),
            {
                correlationId: corrId,
                replyTo: this.respondQueueName,
                contentType: 'application/json',
                type: 'C2S',
                headers: {
                    stream
                }
            }
        );
        return subject;
    }

    private handleMessage(msg: amqp.Message | null): void {
        if (msg === null) {
            return;
        }
        const subject = this.pendingRequests[msg.properties.correlationId];
        if (subject === undefined) {
            console.error(`recived a amqp meesage with unknonw correlation number: ${JSON.stringify(msg)}`)
            return;
        }
        const body = JSON.parse(msg.content.toString());
        if (msg.properties.headers.status !== 204) {
            subject.next({
                body,
                status: msg.properties.headers.status
            });
        }
        if (msg.properties.headers.endStream === true) {
            delete this.pendingRequests[msg.properties.correlationId];
            subject.complete();
        }
    }

    async flush() {
        if (this.ch === undefined || this.respondQueueName === undefined) {
            throw new Error('server is not initilized yet');
        }
        this.ch.ackAll();
        await this.ch.purgeQueue(this.respondQueueName);
        this.pendingRequests = {};
    }

    async close() {
        this.pendingRequests = {};
        if (this.ch === undefined) {
            return;
        }
        try {
            await this.ch.close();
        } catch(err) {
            console.error(err);
        }
    }
}