import axios from 'axios';

interface QueueStatus {
    name: string;
    consumers: number;
    messages: number;
}
interface RabbitmqQueuesDataRespItem extends QueueStatus {
    exclusive: boolean;
    [x: string]: any;
}

export async function queueStatus(user: string, password: string, queueName: string): Promise<QueueStatus> {
    const qs = await queuesStatus(user, password);
    return qs.filter(q => q.name === queueName)[0];
}

export async function queuesStatus(username: string='guest', password: string='guest', filterExclusive=true): Promise<QueueStatus[]> {
    const url = `${getRabbitMqUrl()}/api/queues/`;
    const resp = await axios.get<RabbitmqQueuesDataRespItem[]>(url, {
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


export async function purgeAllQueues(username: string='guest', password: string='guest') {
    const qs = await queuesStatus();
    for (let q of qs) {
        if (q.messages > 0) { 
            purgeQueue(q.name, username, password);
        }
    }
}

export async function purgeQueue(queueName: string, username: string='guest', password: string='guest') {
    const url = `${getRabbitMqUrl()}/api/queues/${encodeURIComponent('/')}/${encodeURIComponent(queueName)}/contents`;
    const resp = await axios.delete(url, {
        auth: {
            username,
            password
          }
    });
}

function getRabbitMqUrl(): string {
    if (process.env.RABBITMQ_HOSTNAME !== undefined) {
        return `http://${process.env.RABBITMQ_HOSTNAME}:15672`;
    } else {
        return 'http://localhost:15672';
    }
}