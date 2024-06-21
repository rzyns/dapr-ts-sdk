import { Either } from "effect";
import { AppCallbackServiceImplementation, TopicSubscription } from "../proto/dapr/proto/runtime/v1/appcallback.js";
import { CallContext } from "nice-grpc-common";

type TopicEventHandler_ = AppCallbackServiceImplementation["onTopicEvent"];
type TopicEventRequest_ = Parameters<TopicEventHandler_>[0];
type TopicEventRequest<Name extends string, Metadata extends Record<string, string>> = {
    [K in keyof TopicEventRequest_]: K extends "name" ? Name : K extends "metadata" ? Metadata : TopicEventRequest_[K];
};
type TopicEventResponse = Awaited<ReturnType<TopicEventHandler_>>;

export type TopicEventHandler<Name extends string, ResponseType extends TopicEventResponse, ContextExt = {}, MetaData extends Record<string, string> = Record<string, string>> =
    (req: TopicEventRequest<Name, MetaData>, ctx: CallContext & ContextExt) => Promise<ResponseType>;


export type TopicEventHandlerConfig<Name extends string, I, O, E extends Error = Error> = (Omit<TopicSubscription, "pubsubName"> & {
    pubsubName: Name;
    decodeRequest: (input: TopicEventRequest_) => Either.Either<I, E>;
    encodeResponse: (output: O) => Either.Either<TopicEventResponse, E>;
    handler: (input: I, ctx: CallContext) => Promise<O>;
});

export namespace TopicEventHandlerConfig {
    export function configToSubscriptions<A extends Record<string, TopicEventHandlerConfig<any, any, any, any>>>(config: A) {
        return Object.entries(config).map(([name, handler]) => {
            return {
                pubsubName: name,
                bulkSubscribe: handler.bulkSubscribe,
                deadLetterTopic: handler.deadLetterTopic,
                metadata: handler.metadata,
                routes: handler.routes,
                topic: handler.topic,
            } satisfies TopicSubscription;
        });
    }

    export function toImplementation<A>(config: { [K in keyof A]: [K] extends [string] ? TopicEventHandlerConfig<K, any, any, any> : never }): AppCallbackServiceImplementation["onTopicEvent"] {
        return async (req, ctx) => {
            const handler = config[req.pubsubName as keyof A];
            if (!handler) {
                throw new Error(`No handler found for ${req.pubsubName}`);
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
