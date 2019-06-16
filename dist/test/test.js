"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const chai_1 = require("chai");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const amqpRpcClient_1 = require("../amqpRpcClient");
const rabbitmqMonitor_1 = require("../rabbitmqMonitor");
chai.use(chaiAsPromised);
function sleep(ms = 0) {
    return new Promise(r => setTimeout(r, ms));
}
describe("amqp server", function () {
    it("rabbitmq does not exists", async function () {
        const amqpRpcServer = new __1.AmqpRpcServer('some queue', (data) => data, 'amqp://localhost:1111');
        const succ = await amqpRpcServer.start(1);
        chai_1.expect(succ === false);
    }).timeout(5000);
    it("rabbitmq regular server", async function () {
        const amqpRpcServer = new __1.AmqpRpcServer('some queue', (data) => data);
        const succ = await amqpRpcServer.start();
        chai_1.expect(succ === true);
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
describe("messaging", function () {
    this.beforeEach(async () => {
        await rabbitmqMonitor_1.purgeAllQueues();
    });
    it("simple messaging", async function () {
        console.log('*** simple messaging');
        const amqpRpcServer = new __1.AmqpRpcServer('some queue', async (data, subject) => subject.next(data + 1));
        const ServerSucc = await amqpRpcServer.start();
        chai_1.expect(ServerSucc === true);
        const amqpRpcClient = new amqpRpcClient_1.AmqpRpcClient();
        const clinetSucc = await amqpRpcClient.init(1);
        chai_1.expect(clinetSucc === true);
        const resp = await amqpRpcClient.send('some queue', 3).toPromise();
        chai_1.expect(resp.status).equal(200);
        chai_1.expect(resp.body).equal(4);
        console.log('*** simple messaging - done');
    }).timeout(5000);
    it("stream messaging", function (done) {
        console.log('*** stream messaging');
        const amqpRpcServer = new __1.AmqpRpcServer('some queue', async (data, subject) => {
            console.log('start loop');
            for (let i = 0; i < 10; i++) {
                data = data + 1;
                console.log('add one and subject.next();');
                subject.next(data);
            }
            console.log('subject.complete();');
            subject.complete();
        });
        const amqpRpcClient = new amqpRpcClient_1.AmqpRpcClient();
        Promise.all([
            amqpRpcServer.start(),
            amqpRpcClient.init(1)
        ]).then(() => {
            // amqpRpcClient.send('some queue', 3, true)
            // .pipe(
            //   toArray()
            // ).subscribe(a => {
            //     console.log(a);
            // });
            amqpRpcClient.send('some queue', 3, true)
                .subscribe(v => {
                console.log(v);
            }, () => { }, () => {
                // done();
            });
        });
    }).timeout(5000);
    // it("stream messaging", function (done) {
    //   const amqpRpcServer = new AmqpRpcServer('some queue', (data) => data+1);
    //   const amqpRpcClient = new AmqpRpcClient();
    //   Promise.all([amqpRpcServer.start(), amqpRpcClient.init(1)]).then(() => {
    //     const resp = amqpRpcClient.sendStream('some queue', 3);
    //     resp.subscribe(m => {
    //       console.log(m);
    //     })
    //   });
    // }).timeout(1000000);;
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
        console.log(data);
    });
});
//# sourceMappingURL=test.js.map