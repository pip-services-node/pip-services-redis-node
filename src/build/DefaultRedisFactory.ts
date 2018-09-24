/** @module build */
import { Factory } from 'pip-services-components-node';
import { Descriptor } from 'pip-services-commons-node';

import { RedisCache } from '../cache/RedisCache';
import { RedisLock } from '../lock/RedisLock';

/**
 * Creates Redis components by their descriptors.
 * 
 * @see [[RedisCache]]
 * @see [[RedisLock]]
 */
export class DefaultRedisFactory extends Factory {
	public static readonly Descriptor = new Descriptor("pip-services", "factory", "redis", "default", "1.0");
	public static readonly RedisCacheDescriptor = new Descriptor("pip-services", "cache", "redis", "*", "1.0");
	public static readonly RedisLockDescriptor = new Descriptor("pip-services", "lock", "redis", "*", "1.0");

	/**
	 * Create a new instance of the factory.
	 */
	public constructor() {
        super();
		this.registerAsType(DefaultRedisFactory.RedisCacheDescriptor, RedisCache);
		this.registerAsType(DefaultRedisFactory.RedisLockDescriptor, RedisLock);
	}
}