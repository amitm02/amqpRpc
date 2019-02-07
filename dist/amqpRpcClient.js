"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const amqp = require("amqplib");
const uuid_1 = require("uuid");
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
                await timer(5000);
                if (maxRetry !== undefined && connRetry >= maxRetry) {
                    return false;
                }
            }
        }
        this.ch = await conn.createChannel();
        const assertQueueResp = await this.ch.assertQueue('', { exclusive: true });
        this.respondQueueName = assertQueueResp.queue;
        this.ch.consume(this.respondQueueName, this.handleMessage.bind(this), { noAck: true });
        return true;
    }
    handleMessage(msg) {
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
    send(targetQueueName, data) {
        const corrId = uuid_1.v4();
        return new Promise((resolve, error) => {
            if (this.ch === undefined) {
                error('server is not initilized yet');
                return;
            }
            this.pendingRequests[corrId] = resolve;
            this.ch.sendToQueue(targetQueueName, Buffer.from(JSON.stringify(data)), {
                correlationId: corrId,
                replyTo: this.respondQueueName,
                contentType: 'application/json'
            });
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
exports.AmqpRpcClient = AmqpRpcClient;
//# sourceMappingURL=amqpRpcClient.js.map