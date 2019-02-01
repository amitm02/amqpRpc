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
            this.ampqUrl = 'amqp://localhost';
        }
        this.amqpQueueName = amqpQueueName;
        this.processMessageData = processMessageData;
    }
    async start() {
        const conn = await amqp.connect(this.ampqUrl);
        this.ch = await conn.createChannel();
        this.ch.prefetch(1);
        await this.ch.assertQueue('imageQueue', { durable: false });
        await this.ch.consume(this.amqpQueueName, this.ampqReplay.bind(this));
        console.log(' [*] AMPQ Waiting for messages');
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