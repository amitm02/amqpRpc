"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const chai_1 = require("chai");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const amqpRpcClient_1 = require("../amqpRpcClient");
const rabbitmqMonitor_1 = require("../rabbitmqMonitor");
const operators_1 = require("rxjs/operators");
chai.use(chaiAsPromised);
function sleep(ms = 0) {
    return new Promise(r => setTimeout(r, ms));
}
describe("amqp server", function () {
    it("rabbitmq does not exists", async function () {
        const amqpRpcServer = new __1.AmqpRpcServer('test server NE queue', (data) => data, 'amqp://localhost:1111');
        const succ = await amqpRpcServer.start(1);
        chai_1.expect(succ === false);
        await amqpRpcServer.close();
    }).timeout(5000);
    it("rabbitmq regular server", async function () {
        const amqpRpcServer = new __1.AmqpRpcServer('test server queue', (data) => data);
        const succ = await amqpRpcServer.start();
        chai_1.expect(succ === true);
        await amqpRpcServer.close();
    });
});
describe("amqp client", function () {
    it("client init - rabbitmq does not exists", async function () {
        const amqpRpcClient = new amqpRpcClient_1.AmqpRpcClient('amqp://localhost:1111');
        const succ = await amqpRpcClient.init(1);
        // await amqpRpcClient.close();
        chai_1.expect(succ === false);
    });
    it("client init - regular rabbitmq", async function () {
        const amqpRpcClient = new amqpRpcClient_1.AmqpRpcClient();
        const succ = await amqpRpcClient.init(1);
        // await amqpRpcClient.close();
        chai_1.expect(succ === true);
    });
});
describe("simple messaging", function () {
    this.beforeEach(async function () {
        this.timeout(10000);
        await rabbitmqMonitor_1.purgeAllQueues();
    });
    it("simple messaging", async function () {
        const QUEUE_NAME = 'simple messaging queue';
        const amqpRpcServer = new __1.AmqpRpcServer(QUEUE_NAME, async (data, subject) => {
            subject.next(data + 1);
            subject.complete();
        });
        const ServerSucc = await amqpRpcServer.start();
        chai_1.expect(ServerSucc === true);
        const amqpRpcClient = new amqpRpcClient_1.AmqpRpcClient();
        const clinetSucc = await amqpRpcClient.init(1);
        chai_1.expect(clinetSucc === true);
        const resp = await amqpRpcClient.sendAndAcceptPromise(QUEUE_NAME, 3);
        chai_1.expect(resp.status).equal(200);
        chai_1.expect(resp.body).equal(4);
        await amqpRpcServer.close();
        await amqpRpcClient.close();
    }).timeout(5000);
    it("simple messaging with error", async function () {
        const QUEUE_NAME = 'simple messaging with error queue';
        const amqpRpcServer = new __1.AmqpRpcServer(QUEUE_NAME, async (data, subject) => {
            throw new Error('some error');
        });
        const ServerSucc = await amqpRpcServer.start();
        chai_1.expect(ServerSucc === true);
        const amqpRpcClient = new amqpRpcClient_1.AmqpRpcClient();
        const clinetSucc = await amqpRpcClient.init(1);
        chai_1.expect(clinetSucc === true);
        const resp = await amqpRpcClient.sendAndAcceptPromise(QUEUE_NAME, 3);
        chai_1.expect(resp.status).equal(400);
        await amqpRpcServer.close();
        await amqpRpcClient.close();
    }).timeout(5000);
    it("simple messaging with timeout", async function () {
        const QUEUE_NAME = 'simple messaging with error queue';
        const amqpRpcServer = new __1.AmqpRpcServer(QUEUE_NAME, async (data, subject) => { });
        const ServerSucc = await amqpRpcServer.start();
        chai_1.expect(ServerSucc === true);
        const amqpRpcClient = new amqpRpcClient_1.AmqpRpcClient();
        const clinetSucc = await amqpRpcClient.init(1);
        chai_1.expect(clinetSucc === true);
        const resp = await amqpRpcClient.sendAndAcceptPromise(QUEUE_NAME, 3, 500);
        chai_1.expect(resp.status).equal(408);
        await amqpRpcServer.close();
        await amqpRpcClient.close();
    }).timeout(5000);
});
describe("stream messaging", function () {
    this.beforeEach(async function () {
        this.timeout(10000);
        await rabbitmqMonitor_1.purgeAllQueues();
    });
    it("stream messaging", function (done) {
        const QUEUE_NAME = 'stream messaging queue';
        const amqpRpcServer = new __1.AmqpRpcServer(QUEUE_NAME, async (data, subject) => {
            for (let i = 0; i < 10; i++) {
                subject.next(data);
                data = data + 1;
            }
            subject.complete();
        });
        const amqpRpcClient = new amqpRpcClient_1.AmqpRpcClient();
        Promise.all([
            amqpRpcServer.start(),
            amqpRpcClient.init(1)
        ]).then(() => {
            amqpRpcClient.sendAndAcceptStream(QUEUE_NAME, 0)
                .pipe(operators_1.map(msg => msg.body), operators_1.toArray()).subscribe(a => {
                chai_1.expect(a).eql([...Array(10).keys()]);
                amqpRpcServer.close();
                amqpRpcClient.close();
                done();
            });
        });
    });
    it("stream messaging with subject.error()", function (done) {
        const QUEUE_NAME = 'stream messaging with subject.error()';
        const amqpRpcServer = new __1.AmqpRpcServer(QUEUE_NAME, async (data, subject) => {
            for (let i = 0; i < 15; i++) {
                if (i == 3) {
                    subject.error('some err');
                }
                else {
                    subject.next(data);
                }
            }
            subject.complete();
        });
        const amqpRpcClient = new amqpRpcClient_1.AmqpRpcClient();
        Promise.all([
            amqpRpcServer.start(),
            amqpRpcClient.init(1)
        ]).then(() => {
            amqpRpcClient.sendAndAcceptStream(QUEUE_NAME, 0)
                .pipe(operators_1.map(msg => msg.status), operators_1.toArray()).subscribe(a => {
                chai_1.expect(a).eql([200, 200, 200, 400]);
                amqpRpcServer.close();
                amqpRpcClient.close();
                done();
            });
        });
    });
    it("stream messaging with exception", function (done) {
        const QUEUE_NAME = 'stream messaging with exception queue';
        const amqpRpcServer = new __1.AmqpRpcServer(QUEUE_NAME, async (data, subject) => {
            for (let i = 0; i < 5; i++) {
                if (i == 3) {
                    throw new Error('some error');
                }
                else {
                    subject.next(data);
                }
            }
            subject.complete();
        });
        const amqpRpcClient = new amqpRpcClient_1.AmqpRpcClient();
        Promise.all([
            amqpRpcServer.start(),
            amqpRpcClient.init(1)
        ]).then(() => {
            amqpRpcClient.sendAndAcceptStream(QUEUE_NAME, 0)
                .pipe(operators_1.map(msg => msg.status), operators_1.toArray()).subscribe(a => {
                chai_1.expect(a).eql([200, 200, 200, 400]);
                amqpRpcServer.close();
                amqpRpcClient.close();
                done();
            });
        });
    });
    it("stream messaging without closing Subject", function (done) {
        const QUEUE_NAME = 'stream messaging without closing Subject queue';
        const EXPECTED_TIMEOUT = 3000;
        const amqpRpcServer = new __1.AmqpRpcServer(QUEUE_NAME, async (data, subject) => {
            for (let i = 0; i < 10; i++) {
                subject.next(data);
                data = data + 1;
            }
        });
        const amqpRpcClient = new amqpRpcClient_1.AmqpRpcClient();
        Promise.all([
            amqpRpcServer.start(),
            amqpRpcClient.init(1)
        ]).then(() => {
            const timeout = setTimeout(() => {
                amqpRpcServer.close();
                amqpRpcClient.close();
                done();
            }, EXPECTED_TIMEOUT);
            amqpRpcClient.sendAndAcceptStream(QUEUE_NAME, 0)
                .pipe(operators_1.map(msg => msg.body), operators_1.toArray()).subscribe(a => {
                clearTimeout(timeout);
                amqpRpcServer.close();
                amqpRpcClient.close();
                done(new Error('Unexpected call - function does not contain complete'));
            });
        });
    }).timeout(5000);
    it("stream messaging with timeout", function (done) {
        const QUEUE_NAME = 'stream messaging queue';
        const amqpRpcServer = new __1.AmqpRpcServer(QUEUE_NAME, async (data, subject) => { });
        const amqpRpcClient = new amqpRpcClient_1.AmqpRpcClient();
        Promise.all([
            amqpRpcServer.start(),
            amqpRpcClient.init(1)
        ]).then(() => {
            amqpRpcClient.sendAndAcceptStream(QUEUE_NAME, 0, 500)
                .pipe(operators_1.toArray()).subscribe(a => {
                chai_1.expect(a).lengthOf(1);
                chai_1.expect(a[0]).to.have.property('status', 408);
                amqpRpcServer.close();
                amqpRpcClient.close();
                done();
            });
        });
    }).timeout(5000);
});
describe('rabbitmq monitor', function () {
    it('list queues', async function () {
        const data = await rabbitmqMonitor_1.queuesStatus();
        data.map(q => {
            chai_1.expect(q).to.have.property('name');
            chai_1.expect(q).to.have.property('consumers');
            chai_1.expect(q).to.have.property('messages');
        });
    });
    it('purge all queue', async function () {
        const data = await rabbitmqMonitor_1.purgeAllQueues();
    });
});
//# sourceMappingURL=test.js.map