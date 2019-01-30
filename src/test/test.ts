import { AmqpRpcServer } from '..';
import {expect} from 'chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { AmqpRpcClient } from '../amqpRpcClient';
chai.use(chaiAsPromised);

describe("amqp server", function () {
    it("rabbitmq does not exists", function () {
        const amqpRpcServer = new AmqpRpcServer('some queue', (data) => data, 'amqp://localhost:1111');
        expect(amqpRpcServer.start()).to.eventually.throw();
      });
});

describe("amqp client", function () {
    it("rabbitmq does not exists", function () {
        const amqpRpcClient = new AmqpRpcClient('amqp://localhost:1111');
        expect(amqpRpcClient.init()).to.eventually.throw();
      });
});