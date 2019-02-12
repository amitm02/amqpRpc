"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
async function queueStatus(user, password, queueName) {
    const qs = await queuesStatus(user, password);
    return qs.filter(q => q.name === queueName)[0];
}
exports.queueStatus = queueStatus;
async function queuesStatus(username = 'guest', password = 'guest', filterExclusive = true) {
    const url = `http://localhost:15672/api/queues/`;
    const resp = await axios_1.default.get(url, {
        auth: {
            username,
            password
        }
    });
    if (resp.status !== 200) {
        return [];
    }
    const data = filterExclusive ? resp.data.filter(q => !q.exclusive) : resp.data;
    const queues = data.map(q => ({
        name: q.name,
        consumers: q.consumers,
        messages: q.messages
    }));
    return queues;
}
exports.queuesStatus = queuesStatus;
//# sourceMappingURL=rabbitmqMonitor.js.map