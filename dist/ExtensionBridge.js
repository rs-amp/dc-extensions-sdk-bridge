var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ClientConnection, ServerConnection, MC_EVENTS, } from "message-event-channel";
import { ERRORS_INIT } from "./constants/Errors";
import { CONTEXT, CONTENT_ITEM, MEDIA_LINK, CONTENT_LINK, CONTENT_REFERENCE, FORM, FIELD, FRAME, CONTENT_EDITOR_FORM, } from "./constants/Events";
import * as jsonpath from "jsonpath";
const defaultOptions = {
    window: window,
    connectionTimeout: false,
    timeout: false,
    debug: false,
};
export class ExtensionBridge {
    constructor(fieldPath, options = {}) {
        // Modes:
        // - nothing provided: create connection and get field from extension.
        //   - just this for now
        // - extensions sdk provided: steal connection and get field from input.
        this.fieldPath = fieldPath;
        this.height = 0;
        this.onChange = options.onChange;
        this.parentConnection = options.parentConnection;
        this.field = options.field;
    }
    extractField(field) {
        // Get the child field out of the given field by following the JSON path.
        return jsonpath.query(field, this.fieldPath)[0];
    }
    extractSchema(schema) {
        // Get the child schema out of the given schema by following the JSON path.
        const path = jsonpath.parse(this.fieldPath);
        let root = schema;
        for (let item of path) {
            if (item.expression) {
                switch (item.expression.type) {
                    case "root":
                        schema = root;
                        break;
                    case "identifier":
                    case "numeric_literal":
                        if (schema.type === "object") {
                            schema = schema.properties[item.expression.value];
                        }
                        else if (schema.type === "array") {
                            schema = schema.items;
                        }
                        break;
                }
            }
        }
        return schema;
    }
    generateChildContext(context) {
        var _a;
        this.isEditor = context.category === 'CONTENT_EDITOR';
        const schema = this.extractSchema(this.isEditor ? context.schema : context.fieldSchema);
        return Object.assign(Object.assign({}, context), { fieldSchema: schema, params: Object.assign(Object.assign({}, context.params), { instance: Object.assign(Object.assign({}, context.params.instance), (_a = schema["ui:extension"]) === null || _a === void 0 ? void 0 : _a.params) }), category: "CONTENT_FIELD" });
    }
    insertField(field) {
        return __awaiter(this, void 0, void 0, function* () {
            this.field = field;
            if (this.model !== undefined) {
                // Insert the child field into the parent model using the JSON path.
                // TODO: a lot...
                this.model = field;
                yield this.parentConnection.request(FIELD.MODEL_SET, this.model);
            }
            if (this.onChange)
                this.onChange(field);
        });
    }
    establishConnection() {
        if (this.parentConnection) {
            if (this.childContext) {
                return Promise.resolve();
            }
            else {
                return (() => __awaiter(this, void 0, void 0, function* () {
                    this.context = yield this.parentConnection.request(CONTEXT.GET, null, {
                        timeout: false,
                    });
                    this.childContext = this.generateChildContext(this.context);
                }))();
            }
        }
        const parentConnection = new ClientConnection(defaultOptions);
        return new Promise((resolve, reject) => {
            parentConnection.init();
            parentConnection.on(MC_EVENTS.CONNECTED, () => __awaiter(this, void 0, void 0, function* () {
                try {
                    this.context = yield parentConnection.request(CONTEXT.GET, null, {
                        timeout: false,
                    });
                    this.childContext = this.generateChildContext(this.context);
                }
                catch (e) {
                    reject(new Error(ERRORS_INIT.CONTEXT));
                }
                try {
                    if (this.field == undefined) {
                        this.model = yield parentConnection.request(this.isEditor
                            ? CONTENT_EDITOR_FORM.CONTENT_EDITOR_FORM_GET
                            : FIELD.MODEL_GET);
                        this.field = this.extractField(this.model);
                    }
                    this.parentConnection = parentConnection;
                    resolve();
                }
                catch (e) {
                    reject(e);
                }
            }));
            parentConnection.on(MC_EVENTS.CONNECTION_TIMEOUT, () => {
                reject(new Error(ERRORS_INIT.CONNECTION_TIMEOUT));
            });
        });
    }
    init(frame) {
        return __awaiter(this, void 0, void 0, function* () {
            this.frame = frame;
            // Establish a connection to the host.
            yield this.establishConnection();
            // Create a connection that a child iframe can use.
            this.childConnection = new ServerConnection(frame, defaultOptions);
            // Event forwarding methods
            const directForwarding = [
                // Parent content item/form is the same.
                // TODO: editor extension support.
                CONTENT_ITEM.GET,
                FORM.READ_ONLY,
                FORM.GET_FORM_MODEL,
                // These pop up choosers in DC, forward the result back down to the child.
                MEDIA_LINK.IMAGE_GET,
                MEDIA_LINK.VIDEO_GET,
                CONTENT_LINK.CONTENT_GET,
                CONTENT_REFERENCE.CONTENT_REF_GET,
            ];
            for (let event of directForwarding) {
                this.childConnection.on(event, (payload, resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const result = yield this.parentConnection.request(event, payload);
                        resolve(result);
                    }
                    catch (e) {
                        reject(e);
                    }
                }));
            }
            this.childConnection.on(CONTEXT.GET, (payload, resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                // Return our generated child version of the context.
                resolve(this.childContext);
            }));
            this.childConnection.on(FIELD.MODEL_GET, (payload, resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                resolve(this.field);
            }));
            this.childConnection.on(FIELD.MODEL_IS_VALID, (payload, resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                // TODO: validate as child.
                try {
                    const result = yield this.parentConnection.request(this.isEditor
                        ? CONTENT_EDITOR_FORM.CONTENT_EDITOR_FORM_IS_VALID
                        : FIELD.MODEL_IS_VALID, payload);
                    resolve(result);
                }
                catch (e) {
                    reject(e);
                }
            }));
            this.childConnection.on(FIELD.MODEL_RESET, (payload, resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                // TODO: proper field reset
                try {
                    yield this.insertField({});
                    resolve();
                }
                catch (e) {
                    reject(e);
                }
            }));
            this.childConnection.on(FIELD.MODEL_SET, (payload, resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield this.insertField(payload);
                    resolve();
                }
                catch (e) {
                    reject(e);
                }
            }));
            this.childConnection.on(FIELD.MODEL_VALIDATE, (payload, resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                reject(new Error("Validation unsupported."));
            }));
            this.childConnection.on(FIELD.SCHEMA_GET, (payload, resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (this.isEditor) {
                        resolve(this.childContext.fieldSchema);
                    }
                    else {
                        const result = yield this.parentConnection.request(FIELD.SCHEMA_GET, payload);
                        resolve(this.extractSchema(result));
                    }
                }
                catch (e) {
                    reject(e);
                }
            }));
            this.childConnection.on(FRAME.HEIGHT_GET, (payload, resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                // Return our iframe height.
                resolve(this.height);
            }));
            this.childConnection.on(FRAME.HEIGHT_SET, (payload, resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                // Set our iframe height.
                this.height = payload;
                this.frame.style.height = payload + "px";
                if (resolve) {
                    resolve();
                }
            }));
        });
    }
}
