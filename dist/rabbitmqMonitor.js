"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
async function queueStatus(user, password, queueName) {
    const qs = await queuesStatus(user, password);
    return qs.filter(q => q.name === queueName)[0];
}
exports.queueStatus = queueStatus;
async function queuesStatus(username = 'guest', password = 'guest', filterExclusive = true) {
    const url = `${getRabbitMqUrl()}/api/queues/`;
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
async function purgeAllQueues(username = 'guest', password = 'guest') {
    const qs = await queuesStatus();
    for (let q of qs) {
        if (q.messages > 0) {
            purgeQueue(q.name, username, password);
        }
    }
}
exports.purgeAllQueues = purgeAllQueues;
async function purgeQueue(queueName, username = 'guest', password = 'guest') {
    const url = `${getRabbitMqUrl()}/api/queues/${encodeURIComponent('/')}/${encodeURIComponent(queueName)}/contents`;
    const resp = await axios_1.default.delete(url, {
        auth: {
            username,
            password
        }
    });
}
exports.purgeQueue = purgeQueue;
function getRabbitMqUrl() {
    if (process.env.RABBITMQ_HOSTNAME !== undefined) {
        return `http://${process.env.RABBITMQ_HOSTNAME}:15672`;
    }
    else {
        return 'http://localhost:15672';
    }
}
//# sourceMappingURL=rabbitmqMonitor.js.map