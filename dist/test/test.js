"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
describe("/amqp server", function () {
    it("rabbitmq does not exists", function (done) {
        const amqpRpcServer = new __1.AmqpRpcServer('some queue', (data) => data);
    });
});
//# sourceMappingURL=test.js.map