"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** @module cache */
/** @hidden */
const _ = require('lodash');
/** @hidden */
const async = require('async');
const pip_services_commons_node_1 = require("pip-services-commons-node");
const pip_services_commons_node_2 = require("pip-services-commons-node");
const pip_services_components_node_1 = require("pip-services-components-node");
const pip_services_components_node_2 = require("pip-services-components-node");
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
class RedisCache {
    /**
     * Creates a new instance of this cache.
     */
    constructor() {
        this._connectionResolver = new pip_services_components_node_1.ConnectionResolver();
        this._credentialResolver = new pip_services_components_node_2.CredentialResolver();
        this._timeout = 30000;
        this._retries = 3;
        this._client = null;
    }
    /**
     * Configures component by passing configuration parameters.
     *
     * @param config    configuration parameters to be set.
     */
    configure(config) {
        this._connectionResolver.configure(config);
        this._credentialResolver.configure(config);
        this._timeout = config.getAsIntegerWithDefault('options.timeout', this._timeout);
        this._retries = config.getAsIntegerWithDefault('options.retries', this._retries);
    }
    /**
     * Sets references to dependent components.
     *
     * @param references 	references to locate the component dependencies.
     */
    setReferences(references) {
        this._connectionResolver.setReferences(references);
        this._credentialResolver.setReferences(references);
    }
    /**
     * Checks if the component is opened.
     *
     * @returns true if the component has been opened and false otherwise.
     */
    isOpen() {
        return this._client;
    }
    /**
     * Opens the component.
     *
     * @param correlationId 	(optional) transaction id to trace execution through call chain.
     * @param callback 			callback function that receives error or null no errors occured.
     */
    open(correlationId, callback) {
        let connection;
        let credential;
        async.series([
            (callback) => {
                this._connectionResolver.resolve(correlationId, (err, result) => {
                    connection = result;
                    if (err == null && connection == null)
                        err = new pip_services_commons_node_2.ConfigException(correlationId, 'NO_CONNECTION', 'Connection is not configured');
                    callback(err);
                });
            },
            (callback) => {
                this._credentialResolver.lookup(correlationId, (err, result) => {
                    credential = result;
                    callback(err);
                });
            },
            (callback) => {
                let options = {
                    // connect_timeout: this._timeout,
                    // max_attempts: this._retries,
                    retry_strategy: (options) => { return this.retryStrategy(options); }
                };
                if (connection.getUri() != null) {
                    options.url = connection.getUri();
                }
                else {
                    options.host = connection.getHost() || 'localhost';
                    options.port = connection.getPort() || 6379;
                }
                if (credential != null) {
                    options.password = credential.getPassword();
                }
                let redis = require('redis');
                this._client = redis.createClient(options);
                if (callback)
                    callback(null);
            }
        ], callback);
    }
    /**
     * Closes component and frees used resources.
     *
     * @param correlationId 	(optional) transaction id to trace execution through call chain.
     * @param callback 			callback function that receives error or null no errors occured.
     */
    close(correlationId, callback) {
        if (this._client != null) {
            this._client.quit(((err) => {
                this._client = null;
                if (callback)
                    callback(err);
            }));
        }
        else {
            if (callback)
                callback(null);
        }
    }
    checkOpened(correlationId, callback) {
        if (!this.isOpen()) {
            let err = new pip_services_commons_node_1.InvalidStateException(correlationId, 'NOT_OPENED', 'Connection is not opened');
            callback(err, null);
            return false;
        }
        return true;
    }
    retryStrategy(options) {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            // End reconnecting on a specific error and flush all commands with
            // a individual error
            return new Error('The server refused the connection');
        }
        if (options.total_retry_time > this._timeout) {
            // End reconnecting after a specific timeout and flush all commands
            // with a individual error
            return new Error('Retry time exhausted');
        }
        if (options.attempt > this._retries) {
            // End reconnecting with built in error
            return undefined;
        }
        // reconnect after
        return Math.min(options.attempt * 100, 3000);
    }
    /**
     * Retrieves cached value from the cache using its key.
     * If value is missing in the cache or expired it returns null.
     *
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param key               a unique value key.
     * @param callback          callback function that receives cached value or error.
     */
    retrieve(correlationId, key, callback) {
        if (!this.checkOpened(correlationId, callback))
            return;
        this._client.get(key, callback);
    }
    /**
     * Stores value in the cache with expiration time.
     *
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param key               a unique value key.
     * @param value             a value to store.
     * @param timeout           expiration timeout in milliseconds.
     * @param callback          (optional) callback function that receives an error or null for success
     */
    store(correlationId, key, value, timeout, callback) {
        if (!this.checkOpened(correlationId, callback))
            return;
        this._client.set(key, value, 'PX', timeout, callback);
    }
    /**
     * Removes a value from the cache by its key.
     *
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param key               a unique value key.
     * @param callback          (optional) callback function that receives an error or null for success
     */
    remove(correlationId, key, callback) {
        if (!this.checkOpened(correlationId, callback))
            return;
        this._client.del(key, callback);
    }
}
exports.RedisCache = RedisCache;
//# sourceMappingURL=RedisCache.js.map