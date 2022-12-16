import {
  ClientConnection,
  ServerConnection,
  MC_EVENTS,
} from "message-event-channel";
import { ERRORS_INIT } from "./constants/Errors";
import {
  CONTEXT,
  CONTENT_ITEM,
  MEDIA_LINK,
  CONTENT_LINK,
  CONTENT_REFERENCE,
  FORM,
  FIELD,
  FRAME,
  CONTENT_EDITOR_FORM,
} from "./constants/Events";
import { ContentFieldContextObject } from "./models/ContentFieldContextObject";

import * as jsonpath from "jsonpath";

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

const defaultOptions: InitOptions = {
  window: window,
  connectionTimeout: false,
  timeout: false,
  debug: false,
};

type EventResolve = (result?: any) => any;
type EventReject = (result: any) => any;

export class ExtensionBridge {
  private onChange?: (field: any) => void;
  private parentConnection?: ClientConnection;
  private field: any;
  private isEditor: boolean;

  private childConnection: ServerConnection;
  private context: ContentFieldContextObject;
  private childContext: ContentFieldContextObject;
  private model: any; // Parent model, running without input sdk

  private frame: HTMLIFrameElement;
  private height = 0;

  constructor(private fieldPath: string, options: BridgeOptions = {}) {
    // Modes:
    // - nothing provided: create connection and get field from extension.
    //   - just this for now
    // - extensions sdk provided: steal connection and get field from input.

    this.onChange = options.onChange;
    this.parentConnection = options.parentConnection;
    this.field = options.field;
  }

  private extractField(field: any) {
    // Get the child field out of the given field by following the JSON path.

    return jsonpath.query(field, this.fieldPath)[0];
  }

  private extractSchema(schema: any) {
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
            } else if (schema.type === "array") {
              schema = schema.items;
            }
            break;
        }
      }
    }

    return schema;
  }

  private generateChildContext(
    context: ContentFieldContextObject
  ): ContentFieldContextObject {
    this.isEditor = context.category === 'CONTENT_EDITOR';

    const schema = this.extractSchema(
      this.isEditor ? (context as any).schema : context.fieldSchema
    );

    return {
      ...context,
      fieldSchema: schema,
      params: {
        ...context.params,
        instance: {
          ...context.params.instance,
          ...schema["ui:extension"]?.params,
        },
      },
      category: "CONTENT_FIELD"
    };
  }

  private async insertField(field: any) {
    this.field = field;

    if (this.model !== undefined) {
      // Insert the child field into the parent model using the JSON path.
      // TODO: a lot...
      this.model = field;

      await this.parentConnection.request(FIELD.MODEL_SET, this.model);
    }

    if (this.onChange) this.onChange(field);
  }

  establishConnection() {
    if (this.parentConnection) {
      if (this.childContext) {
        return Promise.resolve();
      } else {
        return (async () => {
          this.context = await this.parentConnection.request(
            CONTEXT.GET,
            null,
            {
              timeout: false,
            }
          );

          this.childContext = this.generateChildContext(this.context);
        })();
      }
    }

    const parentConnection = new ClientConnection(defaultOptions);

    return new Promise<void>((resolve, reject) => {
      parentConnection.init();
      parentConnection.on(MC_EVENTS.CONNECTED, async () => {
        try {
          this.context = await parentConnection.request(CONTEXT.GET, null, {
            timeout: false,
          });

          this.childContext = this.generateChildContext(this.context);
        } catch (e) {
          reject(new Error(ERRORS_INIT.CONTEXT));
        }
        try {
          if (this.field == undefined) {
            this.model = await parentConnection.request(
              this.isEditor
                ? CONTENT_EDITOR_FORM.CONTENT_EDITOR_FORM_GET
                : FIELD.MODEL_GET
            );
            this.field = this.extractField(this.model);
          }

          this.parentConnection = parentConnection;

          resolve();
        } catch (e) {
          reject(e);
        }
      });
      parentConnection.on(MC_EVENTS.CONNECTION_TIMEOUT, () => {
        reject(new Error(ERRORS_INIT.CONNECTION_TIMEOUT));
      });
    });
  }

  async init(frame: HTMLIFrameElement) {
    this.frame = frame;

    // Establish a connection to the host.
    await this.establishConnection();

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
      this.childConnection.on(
        event,
        async (payload: any, resolve: EventResolve, reject: EventReject) => {
          try {
            const result = await this.parentConnection.request(event, payload);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        }
      );
    }

    this.childConnection.on(
      CONTEXT.GET,
      async (payload: any, resolve: EventResolve, reject: EventReject) => {
        // Return our generated child version of the context.
        resolve(this.childContext);
      }
    );

    this.childConnection.on(
      FIELD.MODEL_GET,
      async (payload: any, resolve: EventResolve, reject: EventReject) => {
        resolve(this.field);
      }
    );

    this.childConnection.on(
      FIELD.MODEL_IS_VALID,
      async (payload: any, resolve: EventResolve, reject: EventReject) => {
        // TODO: validate as child.
        try {
          const result = await this.parentConnection.request(
            this.isEditor
              ? CONTENT_EDITOR_FORM.CONTENT_EDITOR_FORM_IS_VALID
              : FIELD.MODEL_IS_VALID,
            payload
          );
          resolve(result);
        } catch (e) {
          reject(e);
        }
      }
    );

    this.childConnection.on(
      FIELD.MODEL_RESET,
      async (payload: any, resolve: EventResolve, reject: EventReject) => {
        // TODO: proper field reset
        try {
          await this.insertField({});
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    );

    this.childConnection.on(
      FIELD.MODEL_SET,
      async (payload: any, resolve: EventResolve, reject: EventReject) => {
        try {
          await this.insertField(payload);
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    );

    this.childConnection.on(
      FIELD.MODEL_VALIDATE,
      async (payload: any, resolve: EventResolve, reject: EventReject) => {
        reject(new Error("Validation unsupported."));
      }
    );

    this.childConnection.on(
      FIELD.SCHEMA_GET,
      async (payload: any, resolve: EventResolve, reject: EventReject) => {
        try {
          if (this.isEditor) {
            resolve(this.childContext.fieldSchema);
          } else {
            const result = await this.parentConnection.request(
              FIELD.SCHEMA_GET,
              payload
            );
            resolve(this.extractSchema(result));
          }
        } catch (e) {
          reject(e);
        }
      }
    );

    this.childConnection.on(
      FRAME.HEIGHT_GET,
      async (payload: any, resolve: EventResolve, reject: EventReject) => {
        // Return our iframe height.
        resolve(this.height);
      }
    );

    this.childConnection.on(
      FRAME.HEIGHT_SET,
      async (payload: any, resolve: EventResolve, reject: EventReject) => {
        // Set our iframe height.
        this.height = payload;
        this.frame.style.height = payload + "px";

        if (resolve) {
          resolve();
        }
      }
    );
  }
}
