import { Factory } from 'pip-services-components-node';
import { Descriptor } from 'pip-services-commons-node';
/**
 * Creates Redis components by their descriptors.
 *
 * @see [[RedisCache]]
 * @see [[RedisLock]]
 */
export declare class DefaultRedisFactory extends Factory {
    static readonly Descriptor: Descriptor;
    static readonly RedisCacheDescriptor: Descriptor;
    static readonly RedisLockDescriptor: Descriptor;
    /**
     * Create a new instance of the factory.
     */
    constructor();
}
