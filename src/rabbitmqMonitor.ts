import axios from 'axios';
import { getConfigValue } from 'container-config';

interface QueueStatus {
    name: string;
    consumers: number;
    messages: number;
}
interface RabbitmqQueuesDataRespItem extends QueueStatus {
    exclusive: boolean;
    [x: string]: any;
}

const rabbitmqUsername = getConfigValue('RABBITMQ_USER');
const rabbitmqPassword = getConfigValue('RABBITMQ_PASSWORD');
const rabbitMqUrl = `http://${getConfigValue('RABBITMQ_HOSTNAME')}:15672`

export async function queueStatus(user: string, password: string, queueName: string): Promise<QueueStatus> {
    const qs = await queuesStatus(user, password);
    return qs.filter(q => q.name === queueName)[0];
}

export async function queuesStatus(username: string='guest', password: string='guest', filterExclusive=true): Promise<QueueStatus[]> {
    const url = `${rabbitMqUrl}/api/queues/`;
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


export async function purgeAllQueues(
    username: string='guest', 
    password: string='guest'): Promise<void> {
    const qs = await queuesStatus();
    console.log(`purging ${qs.length} queues`);
    for (let q of qs) {
        if (q.messages > 0) {
            console.log(`purging ${q.messages} from queue ${q.name}`); 
            await purgeQueue(q.name);
        }
    }
}

export async function purgeQueue(queueName: string): Promise<void> {
    const url = `${rabbitMqUrl}/api/queues/${encodeURIComponent('/')}/${encodeURIComponent(queueName)}/contents`;
    const resp = await axios.delete(url, {
        auth: {
            username: rabbitmqUsername,
            password: rabbitmqPassword
          }
    });
}
