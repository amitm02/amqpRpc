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
    const url = `http://localhost:15672/api/queues/`;
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

