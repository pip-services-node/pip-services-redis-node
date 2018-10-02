import { ConfigParams } from 'pip-services-commons-node';
import { IConfigurable } from 'pip-services-commons-node';
import { IReferences } from 'pip-services-commons-node';
import { IReferenceable } from 'pip-services-commons-node';
import { IOpenable } from 'pip-services-commons-node';
import { ICache } from 'pip-services-components-node';
/**
 * Distributed cache that stores values in Redis in-memory database.
 *
 * ### Configuration parameters ###
 *
 * connection(s):
 *   - discovery_key:         (optional) a key to retrieve the connection from [[https://rawgit.com/pip-services-node/pip-services-components-node/master/doc/api/interfaces/connect.idiscovery.html IDiscovery]]
 *   - host:                  host name or IP address
 *   - port:                  port number
 *   - uri:                   resource URI or connection string with all parameters in it
 *
 * credential(s):
 *   - store_key:             key to retrieve parameters from credential store
 *   - username:              user name (currently is not used)
 *   - password:              user password
 *
 * options:
 *   - retries:               number of retries (default: 3)
 *   - timeout:               default caching timeout in milliseconds (default: 1 minute)
 *   - max_size:              maximum number of values stored in this cache (default: 1000)
 *
 * ### References ###
 *
 * - <code>*:discovery:*:*:1.0</code>        (optional) [[https://rawgit.com/pip-services-node/pip-services-components-node/master/doc/api/interfaces/connect.idiscovery.html IDiscovery]] services to resolve connection
 * - <code>*:credential-store:*:*:1.0</code> (optional) Credential stores to resolve credential
 *
 * ### Example ###
 *
 *     let cache = new RedisCache();
 *     cache.configure(ConfigParams.fromTuples(
 *       "host", "localhost",
 *       "port", 6379
 *     ));
 *
 *     cache.open("123", (err) => {
 *       ...
 *     });
 *
 *     cache.store("123", "key1", "ABC", (err) => {
 *          cache.store("123", "key1", (err, value) => {
 *              // Result: "ABC"
 *          });
 *     });
 */
export declare class RedisCache implements ICache, IConfigurable, IReferenceable, IOpenable {
    private _connectionResolver;
    private _credentialResolver;
    private _timeout;
    private _retries;
    private _client;
    /**
     * Creates a new instance of this cache.
     */
    constructor();
    /**
     * Configures component by passing configuration parameters.
     *
     * @param config    configuration parameters to be set.
     */
    configure(config: ConfigParams): void;
    /**
     * Sets references to dependent components.
     *
     * @param references 	references to locate the component dependencies.
     */
    setReferences(references: IReferences): void;
    /**
     * Checks if the component is opened.
     *
     * @returns true if the component has been opened and false otherwise.
     */
    isOpen(): boolean;
    /**
     * Opens the component.
     *
     * @param correlationId 	(optional) transaction id to trace execution through call chain.
     * @param callback 			callback function that receives error or null no errors occured.
     */
    open(correlationId: string, callback: (err: any) => void): void;
    /**
     * Closes component and frees used resources.
     *
     * @param correlationId 	(optional) transaction id to trace execution through call chain.
     * @param callback 			callback function that receives error or null no errors occured.
     */
    close(correlationId: string, callback: (err: any) => void): void;
    private checkOpened;
    private retryStrategy;
    /**
     * Retrieves cached value from the cache using its key.
     * If value is missing in the cache or expired it returns null.
     *
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param key               a unique value key.
     * @param callback          callback function that receives cached value or error.
     */
    retrieve(correlationId: string, key: string, callback: (err: any, value: any) => void): void;
    /**
     * Stores value in the cache with expiration time.
     *
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param key               a unique value key.
     * @param value             a value to store.
     * @param timeout           expiration timeout in milliseconds.
     * @param callback          (optional) callback function that receives an error or null for success
     */
    store(correlationId: string, key: string, value: any, timeout: number, callback: (err: any) => void): void;
    /**
     * Removes a value from the cache by its key.
     *
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param key               a unique value key.
     * @param callback          (optional) callback function that receives an error or null for success
     */
    remove(correlationId: string, key: string, callback: (err: any) => void): void;
}
