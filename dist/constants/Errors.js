export var ERRORS_INIT;
(function (ERRORS_INIT) {
    /**
     * We failed to fetch all the necessary data for displaying a custom control
     */
    ERRORS_INIT["CONTEXT"] = "Failed to fetch context for UI Extension";
    /**
     * Extension failed to connect to Dynamic content
     */
    ERRORS_INIT["CONNECTION_TIMEOUT"] = "Failed to establish connection to DC Application";
})(ERRORS_INIT || (ERRORS_INIT = {}));
export var ERRORS_CONTENT_ITEM;
(function (ERRORS_CONTENT_ITEM) {
    /**
     * Must supply content type ids in order to fetch a content item/reference
     */
    ERRORS_CONTENT_ITEM["NO_IDS"] = "Please provide content type ids";
})(ERRORS_CONTENT_ITEM || (ERRORS_CONTENT_ITEM = {}));
export var ERRORS_FRAME;
(function (ERRORS_FRAME) {
    /**
     * Must supply a number or nothing, this normally means you've provided a type setHeight can't handle
     */
    ERRORS_FRAME["SET_HEIGHT_NUMBER"] = "setHeight() only accepts an optional number argument";
})(ERRORS_FRAME || (ERRORS_FRAME = {}));
export var FORM;
(function (FORM) {
    /**
     * This normally means you're in a context where there is no model to return i.e Schema Editor
     */
    FORM["NO_MODEL"] = "Unable to retrieve form model as form context does not have an active model.";
})(FORM || (FORM = {}));
export var EXTENSION;
(function (EXTENSION) {
    /**
     * This means you are trying to load an extension that isn't supported by this SDK version
     */
    EXTENSION["UNSUPPORTED_EXTENSION"] = "Unsupported extension";
})(EXTENSION || (EXTENSION = {}));
export var APPLICATION_NAVIGATOR;
(function (APPLICATION_NAVIGATOR) {
    /**
     * The location href must include a #!
     */
    APPLICATION_NAVIGATOR["MUST_INCLUDE_HASH_BANG"] = "locationHref must include a hash bang (#!)";
})(APPLICATION_NAVIGATOR || (APPLICATION_NAVIGATOR = {}));
