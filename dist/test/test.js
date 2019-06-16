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
        const amqpRpcServer = new __1.AmqpRpcServer('some queue', (data) => data, 'amqp://localhost:1111');
        const succ = await amqpRpcServer.start(1);
        chai_1.expect(succ === false);
        await amqpRpcServer.close();
    }).timeout(5000);
    it("rabbitmq regular server", async function () {
        const amqpRpcServer = new __1.AmqpRpcServer('some queue', (data) => data);
        const succ = await amqpRpcServer.start();
        chai_1.expect(succ === true);
        await amqpRpcServer.close();
    });
});
describe("amqp client", function () {
    it("client init - rabbitmq does not exists", async function () {
        const amqpRpcClient = new amqpRpcClient_1.AmqpRpcClient('amqp://localhost:1111');
        const succ = await amqpRpcClient.init(1);
        chai_1.expect(succ === false);
    });
    it("client init - regular rabbitmq", async function () {
        const amqpRpcClient = new amqpRpcClient_1.AmqpRpcClient();
        const succ = await amqpRpcClient.init(1);
        chai_1.expect(succ === true);
    });
});
describe("simple messaging", function () {
    this.beforeEach(async () => {
        await rabbitmqMonitor_1.purgeAllQueues();
    });
    it("simple messaging", async function () {
        const amqpRpcServer = new __1.AmqpRpcServer('some queue', async (data, subject) => subject.next(data + 1));
        const ServerSucc = await amqpRpcServer.start();
        chai_1.expect(ServerSucc === true);
        const amqpRpcClient = new amqpRpcClient_1.AmqpRpcClient();
        const clinetSucc = await amqpRpcClient.init(1);
        chai_1.expect(clinetSucc === true);
        const resp = await amqpRpcClient.send('some queue', 3).toPromise();
        chai_1.expect(resp.status).equal(200);
        chai_1.expect(resp.body).equal(4);
        await amqpRpcServer.close();
    }).timeout(5000);
    it("simple messaging with error", async function () {
        const amqpRpcServer = new __1.AmqpRpcServer('some queue', async (data, subject) => {
            throw new Error('some error');
        });
        const ServerSucc = await amqpRpcServer.start();
        chai_1.expect(ServerSucc === true);
        const amqpRpcClient = new amqpRpcClient_1.AmqpRpcClient();
        const clinetSucc = await amqpRpcClient.init(1);
        chai_1.expect(clinetSucc === true);
        const resp = await amqpRpcClient.send('some queue', 3).toPromise();
        chai_1.expect(resp.status).equal(400);
        await amqpRpcServer.close();
    }).timeout(5000);
});
describe("stream messaging", function () {
    this.beforeEach(async () => {
        await rabbitmqMonitor_1.purgeAllQueues();
    });
    it("stream messaging", function (done) {
        const amqpRpcServer = new __1.AmqpRpcServer('some queue', async (data, subject) => {
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
            amqpRpcClient.send('some queue', 0, true)
                .pipe(operators_1.map(msg => msg.body), operators_1.toArray()).subscribe(a => {
                chai_1.expect(a).eql([...Array(10).keys()]);
                amqpRpcServer.close();
                done();
            });
        });
    });
    it("stream messaging with subject.error()", function (done) {
        const amqpRpcServer = new __1.AmqpRpcServer('some queue', async (data, subject) => {
            for (let i = 0; i < 5; i++) {
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
            amqpRpcClient.send('some queue', 0, true)
                .pipe(operators_1.map(msg => msg.status), operators_1.toArray()).subscribe(a => {
                chai_1.expect(a).eql([200, 200, 200, 400]);
                amqpRpcServer.close();
                done();
            });
        });
    });
    it("stream messaging with unhandled error", function (done) {
        const amqpRpcServer = new __1.AmqpRpcServer('some queue', async (data, subject) => {
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
            amqpRpcClient.send('some queue', 0, true)
                .pipe(operators_1.map(msg => msg.status), operators_1.toArray()).subscribe(a => {
                chai_1.expect(a).eql([200, 200, 200, 400]);
                amqpRpcServer.close();
                done();
            });
        });
    });
    it("stream messaging without closing Subject", function (done) {
        const EXPECTED_TIMEOUT = 3000;
        const amqpRpcServer = new __1.AmqpRpcServer('some queue', async (data, subject) => {
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
                done();
            }, EXPECTED_TIMEOUT);
            amqpRpcClient.send('some queue', 0, true)
                .pipe(operators_1.map(msg => msg.body), operators_1.toArray()).subscribe(a => {
                clearTimeout(timeout);
                amqpRpcServer.close();
                done(new Error('Unexpected call - function does not contain complete'));
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