import { AmqpRpcServer } from '..';
import {expect} from 'chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { AmqpRpcClient } from '../amqpRpcClient';
chai.use(chaiAsPromised);

describe("amqp server", function () {
    it("rabbitmq does not exists", async function () {
        const amqpRpcServer = new AmqpRpcServer('some queue', (data) => data, 'amqp://localhost:1111');
        const succ = await amqpRpcServer.start(1);
        expect(succ === false);
      }).timeout(5000);
      it("rabbitmq regular server", async function () {
        const amqpRpcServer = new AmqpRpcServer('some queue', (data) => data);
        const succ = await amqpRpcServer.start();
        expect(succ === false);
      });
});

describe("amqp client", function () {
    it("rabbitmq does not exists", function () {
        const amqpRpcClient = new AmqpRpcClient('amqp://localhost:1111');
        expect(amqpRpcClient.init()).to.eventually.throw();
      });
});