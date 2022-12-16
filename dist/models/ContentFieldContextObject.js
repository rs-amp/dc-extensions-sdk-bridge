export function isContextObject(context) {
    var _a;
    return ((_a = context === null || context === void 0 ? void 0 : context.params) === null || _a === void 0 ? void 0 : _a.installation) !== undefined;
}
export function isContentFieldContextObject(context) {
    var _a;
    return (isContextObject(context) &&
        context.category === "CONTENT_FIELD" &&
        ((_a = context === null || context === void 0 ? void 0 : context.params) === null || _a === void 0 ? void 0 : _a.instance) !== undefined &&
        context.contentItemId !== undefined &&
        context.fieldSchema !== undefined &&
        context.locales !== undefined &&
        context.readOnly !== undefined &&
        context.stagingEnvironment !== undefined &&
        context.visualisation !== undefined &&
        context.hub !== undefined);
}
