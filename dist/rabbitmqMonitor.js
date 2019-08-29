"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const container_config_1 = require("container-config");
const rabbitmqUsername = container_config_1.getConfigValue('RABBITMQ_USER');
const rabbitmqPassword = container_config_1.getConfigValue('RABBITMQ_PASSWORD');
const rabbitMqUrl = `http://${container_config_1.getConfigValue('RABBITMQ_HOSTNAME')}:15672`;
async function queueStatus(user, password, queueName) {
    const qs = await queuesStatus(user, password);
    return qs.filter(q => q.name === queueName)[0];
}
exports.queueStatus = queueStatus;
async function queuesStatus(username = 'guest', password = 'guest', filterExclusive = true) {
    const url = `${rabbitMqUrl}/api/queues/`;
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
    console.log(`purging ${qs.length} queues`);
    for (let q of qs) {
        if (q.messages > 0) {
            console.log(`purging ${q.messages} from queue ${q.name}`);
            await purgeQueue(q.name);
        }
    }
}
exports.purgeAllQueues = purgeAllQueues;
async function purgeQueue(queueName) {
    const url = `${rabbitMqUrl}/api/queues/${encodeURIComponent('/')}/${encodeURIComponent(queueName)}/contents`;
    const resp = await axios_1.default.delete(url, {
        auth: {
            username: rabbitmqUsername,
            password: rabbitmqPassword
        }
    });
}
exports.purgeQueue = purgeQueue;
//# sourceMappingURL=rabbitmqMonitor.js.map