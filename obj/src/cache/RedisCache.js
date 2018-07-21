"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require('lodash');
const async = require('async');
const pip_services_commons_node_1 = require("pip-services-commons-node");
const pip_services_commons_node_2 = require("pip-services-commons-node");
const pip_services_components_node_1 = require("pip-services-components-node");
const pip_services_components_node_2 = require("pip-services-components-node");
class RedisCache {
    constructor() {
        this._connectionResolver = new pip_services_components_node_1.ConnectionResolver();
        this._credentialResolver = new pip_services_components_node_2.CredentialResolver();
        this._timeout = 30000;
        this._retries = 3;
        this._client = null;
    }
    configure(config) {
        this._connectionResolver.configure(config);
        this._credentialResolver.configure(config);
        this._timeout = config.getAsIntegerWithDefault('options.timeout', this._timeout);
        this._retries = config.getAsIntegerWithDefault('options.retries', this._retries);
    }
    setReferences(references) {
        this._connectionResolver.setReferences(references);
        this._credentialResolver.setReferences(references);
    }
    isOpened() {
        return this._client;
    }
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
        if (!this.isOpened()) {
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
    retrieve(correlationId, key, callback) {
        if (!this.checkOpened(correlationId, callback))
            return;
        this._client.get(key, callback);
    }
    store(correlationId, key, value, timeout, callback) {
        if (!this.checkOpened(correlationId, callback))
            return;
        this._client.set(key, value, 'PX', timeout, callback);
    }
    remove(correlationId, key, callback) {
        if (!this.checkOpened(correlationId, callback))
            return;
        this._client.del(key, callback);
    }
}
exports.RedisCache = RedisCache;
//# sourceMappingURL=RedisCache.js.map