"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const chai_1 = require("chai");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const amqpRpcClient_1 = require("../amqpRpcClient");
const rabbitmqMonitor_1 = require("../rabbitmqMonitor");
chai.use(chaiAsPromised);
describe("amqp server", function () {
    it("rabbitmq does not exists", async function () {
        const amqpRpcServer = new __1.AmqpRpcServer('some queue', (data) => data, 'amqp://localhost:1111');
        console.log(1111);
        const succ = await amqpRpcServer.start(1);
        console.log(2222);
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
    it("simple messaging", async function () {
        const amqpRpcServer = new __1.AmqpRpcServer('some queue', (data) => data + 1);
        const ServerSucc = await amqpRpcServer.start();
        chai_1.expect(ServerSucc === true);
        const amqpRpcClient = new amqpRpcClient_1.AmqpRpcClient();
        const clinetSucc = await amqpRpcClient.init(1);
        chai_1.expect(clinetSucc === true);
        const resp = await amqpRpcClient.send('some queue', 3);
        console.log(resp);
        chai_1.expect(resp.status).equal(200);
        chai_1.expect(resp.body).equal(4);
    });
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