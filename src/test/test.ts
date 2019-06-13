import { AmqpRpcServer } from '..';
import { expect } from 'chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { AmqpRpcClient } from '../amqpRpcClient';
import { queuesStatus, purgeAllQueues } from '../rabbitmqMonitor';
chai.use(chaiAsPromised);

describe("amqp server", function () {
  it("rabbitmq does not exists", async function () {
    const amqpRpcServer = new AmqpRpcServer('some queue', (data) => data, 'amqp://localhost:1111');
    console.log(1111);
    const succ = await amqpRpcServer.start(1);
    console.log(2222);
    expect(succ === false);
  }).timeout(5000);

  it("rabbitmq regular server", async function () {
    const amqpRpcServer = new AmqpRpcServer('some queue', (data) => data);
    const succ = await amqpRpcServer.start();
    expect(succ === true);
  });
});

describe("amqp client", function () {
  it("client init - rabbitmq does not exists", async function () {
    const amqpRpcClient = new AmqpRpcClient('amqp://localhost:1111');
    const succ = await amqpRpcClient.init(1);
    expect(succ === false);
  });
  it("client init - regular rabbitmq", async function () {
    const amqpRpcClient = new AmqpRpcClient();
    const succ = await amqpRpcClient.init(1);
    expect(succ === true);
  });
});

describe("messaging", function () {
  it("simple messaging", async function () {
    const amqpRpcServer = new AmqpRpcServer('some queue', (data) => data+1);
    const ServerSucc = await amqpRpcServer.start();
    expect(ServerSucc === true);
    const amqpRpcClient = new AmqpRpcClient();
    const clinetSucc = await amqpRpcClient.init(1);
    expect(clinetSucc === true);
    const resp = await amqpRpcClient.send('some queue', 3);
    console.log(resp);
    expect(resp.status).equal(200);
    expect(resp.body).equal(4);
  });
});

describe('rabbitmq monitor', function () {
  it('list queues', async function () {
    const data = await queuesStatus();
    data.map(q => {
      expect(q).to.have.property('name');
      expect(q).to.have.property('consumers');
      expect(q).to.have.property('messages');
    });
  });

  it('purge all queue', async function () {
    const data = await purgeAllQueues();
    console.log(data);
  });
});