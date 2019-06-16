"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const amqp = require("amqplib");
const uuid_1 = require("uuid");
const rxjs_1 = require("rxjs");
;
class AmqpRpcClient {
    constructor(ampqUrl) {
        // @ts-ignore
        this.pendingRequests = {};
        if (ampqUrl !== undefined) {
            this.ampqUrl = ampqUrl;
        }
        else {
            if (process.env.RABBITMQ_HOSTNAME !== undefined) {
                this.ampqUrl = `amqp://${process.env.RABBITMQ_HOSTNAME}`;
            }
            else {
                this.ampqUrl = 'amqp://localhost';
            }
        }
    }
    async init(maxRetry) {
        let conn = null;
        const timer = (ms) => new Promise(res => setTimeout(res, ms));
        let connRetry = 0;
        while (conn === null) {
            try {
                connRetry += 1;
                console.log(`attempting to connect ${this.ampqUrl}`);
                conn = await amqp.connect(this.ampqUrl);
                console.log(`successful connection to ${this.ampqUrl}`);
            }
            catch (error) {
                console.log(`failed to connect ${this.ampqUrl}`);
                if (maxRetry !== undefined && connRetry >= maxRetry) {
                    return false;
                }
                else {
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
    //make to to complete the subject
    send(targetQueueName, data, stream = false) {
        if (this.ch === undefined) {
            throw new Error('server is not initilized yet');
        }
        const corrId = uuid_1.v4();
        const subject = new rxjs_1.ReplaySubject();
        this.pendingRequests[corrId] = subject;
        this.ch.sendToQueue(targetQueueName, Buffer.from(JSON.stringify(data)), {
            correlationId: corrId,
            replyTo: this.respondQueueName,
            contentType: 'application/json',
            type: 'C2S',
            headers: {
                stream
            }
        });
        return subject;
    }
    handleMessage(msg) {
        if (msg === null) {
            return;
        }
        const subject = this.pendingRequests[msg.properties.correlationId];
        if (subject === undefined) {
            console.error(`recived a amqp meesage with unknonw correlation number: ${JSON.stringify(msg)}`);
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
    close() {
        this.pendingRequests = {};
        if (this.ch === undefined) {
            return;
        }
        this.ch.close();
    }
}
exports.AmqpRpcClient = AmqpRpcClient;
//# sourceMappingURL=amqpRpcClient.js.map