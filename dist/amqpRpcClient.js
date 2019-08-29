"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const amqp = require("amqplib");
const uuid_1 = require("uuid");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const container_config_1 = require("container-config");
class AmqpRpcClient {
    constructor(ampqUrl) {
        // @ts-ignore
        this.pendingRequests = {};
        if (ampqUrl !== undefined) {
            this.ampqUrl = ampqUrl;
        }
        else {
            const rabbitmqHostname = container_config_1.getConfigValue('RABBITMQ_HOSTNAME');
            const rabbitmqUsername = container_config_1.getConfigValue('RABBITMQ_USER');
            const rabbitmqPassword = container_config_1.getConfigValue('RABBITMQ_PASSWORD');
            this.ampqUrl = `amqp://${rabbitmqUsername}:${rabbitmqPassword}@${rabbitmqHostname}`;
            // if (rabbitmqHostname !== undefined) {
            //     this.ampqUrl = `amqp://${rabbitmqHostname}`;
            // } else {
            //     this.ampqUrl = 'amqp://localhost';
            // }
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
        const assertQueueResp = await this.ch.assertQueue('', {
            exclusive: true,
            autoDelete: true
        });
        this.respondQueueName = assertQueueResp.queue;
        this.ch.consume(this.respondQueueName, this.handleMessage.bind(this), { noAck: true });
        return true;
    }
    sendAndAcceptPromise(targetQueueName, data, timeoutMs = 60 * 60 * 1000) {
        return this.send(targetQueueName, data, false, timeoutMs).toPromise();
    }
    sendAndAcceptStream(targetQueueName, data, timeoutMs = 60 * 60 * 1000) {
        return this.send(targetQueueName, data, true, timeoutMs);
    }
    //make to to complete the subject
    send(targetQueueName, data, stream = false, timeoutMs = 60 * 60 * 1000) {
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
            },
            expiration: timeoutMs
        });
        return subject.pipe(operators_1.timeoutWith(timeoutMs, rxjs_1.of({ status: 408, body: `timeout (${timeoutMs}ms)` })));
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
    async close() {
        this.pendingRequests = {};
        if (this.ch === undefined) {
            return;
        }
        try {
            await this.ch.close();
        }
        catch (err) {
            console.error(err);
        }
    }
}
exports.AmqpRpcClient = AmqpRpcClient;
//# sourceMappingURL=amqpRpcClient.js.map