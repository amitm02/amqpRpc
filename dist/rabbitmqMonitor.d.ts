interface QueueStatus {
    name: string;
    consumers: number;
    messages: number;
}
export declare function queueStatus(user: string, password: string, queueName: string): Promise<QueueStatus>;
export declare function queuesStatus(username?: string, password?: string, filterExclusive?: boolean): Promise<QueueStatus[]>;
export {};
