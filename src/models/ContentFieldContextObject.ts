export interface ContextObject {
  category: string;
  params: any;
  hub: any;
}

export interface ContentFieldContextObject
  extends ContextObject {
  contentItemId: string;
  fieldSchema: any;
  params: any;
  locales: any;
  stagingEnvironment: string;
  visualisation: string;
  readOnly: boolean;
  hub: any;
}

export function isContextObject(
  context: unknown | ContextObject
): context is ContextObject {
  return (context as ContextObject)?.params?.installation !== undefined;
}

export function isContentFieldContextObject(
  context: unknown | ContentFieldContextObject
): context is ContentFieldContextObject {
  return (
    isContextObject(context) &&
    (context as ContentFieldContextObject).category === "CONTENT_FIELD" &&
    (context as ContentFieldContextObject)?.params?.instance !== undefined &&
    (context as ContentFieldContextObject).contentItemId !== undefined &&
    (context as ContentFieldContextObject).fieldSchema !== undefined &&
    (context as ContentFieldContextObject).locales !== undefined &&
    (context as ContentFieldContextObject).readOnly !== undefined &&
    (context as ContentFieldContextObject).stagingEnvironment !== undefined &&
    (context as ContentFieldContextObject).visualisation !== undefined &&
    (context as ContentFieldContextObject).hub !== undefined
  );
}
