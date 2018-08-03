const _ = require('lodash');
const async = require('async');

import { ConfigParams } from 'pip-services-commons-node';
import { IConfigurable } from 'pip-services-commons-node';
import { IReferences } from 'pip-services-commons-node';
import { IReferenceable } from 'pip-services-commons-node';
import { IOpenable } from 'pip-services-commons-node';
import { InvalidStateException } from 'pip-services-commons-node';
import { ConfigException } from 'pip-services-commons-node';
import { ConnectionParams } from 'pip-services-components-node';
import { ConnectionResolver } from 'pip-services-components-node';
import { CredentialParams } from 'pip-services-components-node';
import { CredentialResolver } from 'pip-services-components-node';
import { ICache } from 'pip-services-components-node';

export class RedisCache implements ICache, IConfigurable, IReferenceable, IOpenable {
    private _connectionResolver: ConnectionResolver = new ConnectionResolver();
    private _credentialResolver: CredentialResolver = new CredentialResolver();
    
    private _timeout: number = 30000;
    private _retries: number = 3;

    private _client: any = null;

    public constructor() {}

    public configure(config: ConfigParams): void {
        this._connectionResolver.configure(config);
        this._credentialResolver.configure(config);

        this._timeout = config.getAsIntegerWithDefault('options.timeout', this._timeout);
        this._retries = config.getAsIntegerWithDefault('options.retries', this._retries);
    }

    public setReferences(references: IReferences): void {
        this._connectionResolver.setReferences(references);
        this._credentialResolver.setReferences(references);
    }

    public isOpen(): boolean {
        return this._client;
    }

    public open(correlationId: string, callback: (err: any) => void): void {
        let connection: ConnectionParams;
        let credential: CredentialParams;

        async.series([
            (callback) => {
                this._connectionResolver.resolve(correlationId, (err, result) => {
                    connection = result;
                    if (err == null && connection == null)
                        err = new ConfigException(correlationId, 'NO_CONNECTION', 'Connection is not configured');
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
                let options: any = {
                    // connect_timeout: this._timeout,
                    // max_attempts: this._retries,
                    retry_strategy: (options) => { return this.retryStrategy(options); }
                };
                
                if (connection.getUri() != null) {
                    options.url = connection.getUri();
                } else {                    
                    options.host = connection.getHost() || 'localhost';
                    options.port = connection.getPort() || 6379;
                }

                if (credential != null) {
                    options.password = credential.getPassword();
                }
    
                let redis = require('redis');
                this._client = redis.createClient(options);
    
                if (callback) callback(null);    
            }
        ], callback);
    }

    public close(correlationId: string, callback: (err: any) => void): void {
        if (this._client != null) {
            this._client.quit(((err) => {
                this._client = null;    
                if (callback) callback(err);
            }));
        } else {
            if (callback) callback(null);
        }
    }

    private checkOpened(correlationId: string, callback: any): boolean {
        if (!this.isOpen()) {
            let err = new InvalidStateException(correlationId, 'NOT_OPENED', 'Connection is not opened');
            callback(err, null);
            return false;
        }
        
        return true;
    }
    
    private retryStrategy(options: any): any {
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

    public retrieve(correlationId: string, key: string,
        callback: (err: any, value: any) => void): void {
        if (!this.checkOpened(correlationId, callback)) return;

        this._client.get(key, callback);
    }

    public store(correlationId: string, key: string, value: any, timeout: number,
        callback: (err: any) => void): void {
        if (!this.checkOpened(correlationId, callback)) return;

        this._client.set(key, value, 'PX', timeout, callback);
    }

    public remove(correlationId: string, key: string,
        callback: (err: any) => void) {
        if (!this.checkOpened(correlationId, callback)) return;

        this._client.del(key, callback);
    }
    
}