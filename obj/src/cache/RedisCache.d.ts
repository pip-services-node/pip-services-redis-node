import { ConfigParams } from 'pip-services-commons-node';
import { IConfigurable } from 'pip-services-commons-node';
import { IReferences } from 'pip-services-commons-node';
import { IReferenceable } from 'pip-services-commons-node';
import { IOpenable } from 'pip-services-commons-node';
import { ICache } from 'pip-services-components-node';
export declare class RedisCache implements ICache, IConfigurable, IReferenceable, IOpenable {
    private _connectionResolver;
    private _credentialResolver;
    private _timeout;
    private _retries;
    private _client;
    constructor();
    configure(config: ConfigParams): void;
    setReferences(references: IReferences): void;
    isOpen(): boolean;
    open(correlationId: string, callback: (err: any) => void): void;
    close(correlationId: string, callback: (err: any) => void): void;
    private checkOpened;
    private retryStrategy;
    retrieve(correlationId: string, key: string, callback: (err: any, value: any) => void): void;
    store(correlationId: string, key: string, value: any, timeout: number, callback: (err: any) => void): void;
    remove(correlationId: string, key: string, callback: (err: any) => void): void;
}
