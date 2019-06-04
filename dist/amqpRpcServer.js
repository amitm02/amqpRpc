"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const amqp = require("amqplib");
const serializeError = require("serialize-error");
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
    close() {
        if (this.ch === undefined) {
            return;
        }
        this.ch.close();
    }
    async ampqReplay(msg) {
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
        }
        catch (error) {
            console.error(serializeError(error));
            this.sendBackData(replayTo, corrId, serializeError(error), 400);
            this.ch.nack(msg, false, false);
            return;
        }
    }
    sendBackData(targetQueueName, corrId, data, status) {
        if (this.ch === undefined) {
            throw new Error('channel is undefined');
        }
        this.ch.sendToQueue(targetQueueName, Buffer.from(JSON.stringify(data)), {
            correlationId: corrId,
            contentType: 'application/json',
            headers: { status }
        });
    }
}
exports.AmqpRpcServer = AmqpRpcServer;
//# sourceMappingURL=amqpRpcServer.js.map