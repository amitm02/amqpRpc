"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const chai_1 = require("chai");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const amqpRpcClient_1 = require("../amqpRpcClient");
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
//# sourceMappingURL=test.js.map