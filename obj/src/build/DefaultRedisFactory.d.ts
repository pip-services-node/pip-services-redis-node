import { Factory } from 'pip-services-components-node';
import { Descriptor } from 'pip-services-commons-node';
export declare class DefaultRedisFactory extends Factory {
    static readonly Descriptor: Descriptor;
    static readonly RedisCacheDescriptor: Descriptor;
    static readonly RedisLockDescriptor: Descriptor;
    constructor();
}
