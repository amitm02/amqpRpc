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
        const succ = await amqpRpcServer.start(1);
        chai_1.expect(succ === false);
    }).timeout(5000);
    it("rabbitmq regular server", async function () {
        const amqpRpcServer = new __1.AmqpRpcServer('some queue', (data) => data);
        const succ = await amqpRpcServer.start();
        chai_1.expect(succ === false);
    });
});
describe("amqp client", function () {
    it("rabbitmq does not exists", function () {
        const amqpRpcClient = new amqpRpcClient_1.AmqpRpcClient('amqp://localhost:1111');
        chai_1.expect(amqpRpcClient.init()).to.eventually.throw();
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
});
//# sourceMappingURL=test.js.map