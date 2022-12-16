export interface ContextObject {
    category: string;
    params: any;
    hub: any;
}
export interface ContentFieldContextObject extends ContextObject {
    contentItemId: string;
    fieldSchema: any;
    params: any;
    locales: any;
    stagingEnvironment: string;
    visualisation: string;
    readOnly: boolean;
    hub: any;
}
export declare function isContextObject(context: unknown | ContextObject): context is ContextObject;
export declare function isContentFieldContextObject(context: unknown | ContentFieldContextObject): context is ContentFieldContextObject;
