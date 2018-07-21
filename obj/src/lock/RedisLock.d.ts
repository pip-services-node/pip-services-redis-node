import { ConfigParams } from 'pip-services-commons-node';
import { IConfigurable } from 'pip-services-commons-node';
import { IReferences } from 'pip-services-commons-node';
import { IReferenceable } from 'pip-services-commons-node';
import { IOpenable } from 'pip-services-commons-node';
import { Lock } from 'pip-services-components-node';
export declare class RedisLock extends Lock implements IConfigurable, IReferenceable, IOpenable {
    private _connectionResolver;
    private _credentialResolver;
    private _lock;
    private _timeout;
    private _retries;
    private _client;
    configure(config: ConfigParams): void;
    setReferences(references: IReferences): void;
    isOpened(): boolean;
    open(correlationId: string, callback: (err: any) => void): void;
    close(correlationId: string, callback: (err: any) => void): void;
    private checkOpened;
    private retryStrategy;
    tryAcquireLock(correlationId: string, key: string, ttl: number, callback: (err: any, result: boolean) => void): void;
    releaseLock(correlationId: string, key: string, callback?: (err: any) => void): void;
}
