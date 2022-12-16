import { ClientConnection } from "message-event-channel";
export interface InitOptions {
    window: Window;
    connectionTimeout: number | boolean;
    timeout: number | boolean;
    debug: boolean;
}
export interface BridgeOptions {
    /** Called when the field value changes. */
    onChange?: (field: any) => void;
    /** Parent connection, presumably owned by a parent dc-extensions-sdk. */
    parentConnection?: ClientConnection;
    /** Initial field value provided by the parent. If not present, fetches the field from the parent instead. */
    field?: any;
}
export declare class ExtensionBridge {
    private fieldPath;
    private onChange?;
    private parentConnection?;
    private field;
    private isEditor;
    private childConnection;
    private context;
    private childContext;
    private model;
    private frame;
    private height;
    constructor(fieldPath: string, options?: BridgeOptions);
    private extractField;
    private extractSchema;
    private generateChildContext;
    private insertField;
    establishConnection(): Promise<void>;
    init(frame: HTMLIFrameElement): Promise<void>;
}
