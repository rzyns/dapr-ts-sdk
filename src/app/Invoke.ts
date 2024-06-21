
import { Either } from "effect";
import { AppCallbackServiceImplementation } from "../proto/dapr/proto/runtime/v1/appcallback.js";
import { CallContext } from "nice-grpc-common";
import { InvokeResponse } from "../proto/dapr/proto/common/v1/common.js";

type InvokeHandler_ = AppCallbackServiceImplementation["onInvoke"];
type InvokeRequest_ = Parameters<InvokeHandler_>[0];
type InvokeRequest<Name extends string, Metadata extends Record<string, string>> = {
    [K in keyof InvokeRequest_]: K extends "name" ? Name : K extends "metadata" ? Metadata : InvokeRequest_[K];
};

export type InvokeHandler<Name extends string, ResponseType extends InvokeResponse, ContextExt = {}, MetaData extends Record<string, string> = Record<string, string>> =
    (req: InvokeRequest<Name, MetaData>, ctx: CallContext & ContextExt) => Promise<ResponseType>;

export type InvokeHandlerConfig<Name extends string, I, O, E extends Error = Error> = [Name] extends [string] ? {
    method: Name;
    decodeRequest: (input: InvokeRequest_) => Either.Either<I, E>;
    encodeResponse: (output: O) => Either.Either<InvokeResponse, E>;
    handler: (input: I, ctx: CallContext) => Promise<O>;
} : never;


export namespace InvokeConfig {
    export function make<A>(config: { [K in keyof A]: [K] extends [string] ? InvokeHandlerConfig<K, any, any, any> : never }) {
        return config satisfies typeof config;
    }

    export function toImplementation<A>(config: { [K in keyof A]: [K] extends [string] ? InvokeHandlerConfig<K, any, any, any> : never }): AppCallbackServiceImplementation["onInvoke"] {
        return async (req, ctx) => {
            const handler = config[req.method as keyof A];
            if (!handler) {
                throw new Error(`No handler found for ${req.method}`);
            }

            const decoded = handler.decodeRequest(req);
            if (Either.isLeft(decoded)) {
                return decoded.left;
            }

            const result = await handler.handler(decoded.right, ctx);
            if (Either.isLeft(result)) {
                throw new Error("Error encoding response", { cause: result.left });
            } else {
                return handler.encodeResponse(result.right);
            }
        };
    }
}
