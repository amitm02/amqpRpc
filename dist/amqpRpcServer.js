"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const amqp = require("amqplib");
const serializeError = require("serialize-error");
const rxjs_1 = require("rxjs");
const util_1 = require("util");
class AmqpRpcServer {
    constructor(amqpQueueName, processMessageData, ampqUrl) {
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
        this.amqpQueueName = amqpQueueName;
        this.processMessageData = processMessageData;
    }
    async start(maxRetry) {
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
        this.ch.prefetch(1);
        await this.ch.assertQueue(this.amqpQueueName, { durable: false });
        await this.ch.consume(this.amqpQueueName, this.ampqReplay.bind(this));
        console.log(` [*] AMPQ Waiting for messages on queue "${this.amqpQueueName}"`);
        return true;
    }
    async ampqReplay(msg) {
        if (msg === null) {
            return;
        }
        if (!validChannel(this.ch)) {
            return;
        }
        const ch = this.ch;
        const replyTo = msg.properties.replyTo;
        const corrId = msg.properties.correlationId;
        const subject = new rxjs_1.Subject();
        const isRequestingStream = msg.properties.headers.stream;
        subject.subscribe({
            next: (respData) => {
                if (isRequestingStream) {
                    this.sendBackData(replyTo, corrId, respData, 200, false);
                }
                else {
                    this.sendBackData(replyTo, corrId, respData, 200, true);
                    ch.ack(msg);
                }
            },
            error: (err) => {
                this.sendBackData(replyTo, corrId, serializeError(err), 400, true);
                ch.nack(msg);
            },
            complete: () => {
                if (isRequestingStream) {
                    this.sendBackData(replyTo, corrId, null, 204, true);
                    ch.nack(msg);
                }
            }
        });
        try {
            const reqData = JSON.parse(msg.content.toString());
            await this.processMessageData(reqData, subject);
        }
        catch (err) {
            console.error(serializeError(util_1.error));
            subject.unsubscribe();
            this.sendBackData(replyTo, corrId, serializeError(err), 400, true);
        }
    }
    sendBackData(targetQueueName, corrId, data, status, endStream) {
        if (!validChannel(this.ch)) {
            return;
        }
        ;
        this.ch.sendToQueue(targetQueueName, Buffer.from(JSON.stringify(data)), {
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
exports.AmqpRpcServer = AmqpRpcServer;
function validChannel(ch) {
    if (ch === undefined) {
        throw new Error('channel is undefined');
    }
    return true;
}
//# sourceMappingURL=amqpRpcServer.js.map