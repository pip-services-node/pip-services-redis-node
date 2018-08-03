const _ = require('lodash');
const async = require('async');

import { ConfigParams } from 'pip-services-commons-node';
import { IConfigurable } from 'pip-services-commons-node';
import { IReferences } from 'pip-services-commons-node';
import { IReferenceable } from 'pip-services-commons-node';
import { IOpenable } from 'pip-services-commons-node';
import { IdGenerator } from 'pip-services-commons-node';
import { InvalidStateException } from 'pip-services-commons-node';
import { ConfigException } from 'pip-services-commons-node';
import { ConnectionParams } from 'pip-services-components-node';
import { ConnectionResolver } from 'pip-services-components-node';
import { CredentialParams } from 'pip-services-components-node';
import { CredentialResolver } from 'pip-services-components-node';
import { Lock } from 'pip-services-components-node';

export class RedisLock extends Lock implements IConfigurable, IReferenceable, IOpenable {
    private _connectionResolver: ConnectionResolver = new ConnectionResolver();
    private _credentialResolver: CredentialResolver = new CredentialResolver();
    
    private _lock: string = IdGenerator.nextLong();
    private _timeout: number = 30000;
    private _retries: number = 3;

    private _client: any = null;

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

    public tryAcquireLock(correlationId: string, key: string, ttl: number,
        callback: (err: any, result: boolean) => void): void {
        if (!this.checkOpened(correlationId, callback)) return;

        this._client.set(key, this._lock, 'NX', 'PX', ttl, (err, result) => {
            callback(err, result == "OK");
        });
    }

    public releaseLock(correlationId: string, key: string,
        callback?: (err: any) => void): void {
        if (!this.checkOpened(correlationId, callback)) return;

        // Start transaction on key
        this._client.watch(key, (err) => {
            if (err) {
                if (callback) callback(err);
                return;
            }

            // Read and check if lock is the same
            this._client.get(key, (err, result) => {
                if (err) {
                    if (callback) callback(err);
                    return;                    
                }

                // Remove the lock if it matches
                if (result == this._lock) {
                    this._client.multi()
                        .del(key)
                        .exec(callback);
                }
                // Cancel transaction if it doesn't match
                else {
                    this._client.unwatch(callback);
                }
            })
        });
    }    
}