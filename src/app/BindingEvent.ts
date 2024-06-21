import { Data, Effect, Either, Layer, Record, Struct, Match, Predicate, Option } from "effect";
import { AppCallbackServiceImplementation, BindingEventResponse } from "../proto/dapr/proto/runtime/v1/appcallback.js";
import { CallContext } from "nice-grpc-common";
import { Schema } from "@effect/schema";

export { BindingEventRequest, BindingEventResponse } from "../proto/dapr/proto/runtime/v1/appcallback.js";

type BindingEventHandler_ = AppCallbackServiceImplementation["onBindingEvent"];
type BindingEventRequest_ = Parameters<BindingEventHandler_>[0];

export type BindingEventHandler<I, Err extends Error = Error> = (req: I, ctx: CallContext) => Effect.Effect<BindingEventResponse, Err>;

export type BindingEventHandlerConfig<N extends string, I, Err extends Error = Error> = {
    name: N;
    handler: BindingEventHandler<I, Err>;
    decode: Schema.Schema<I, BindingEventRequest_ & { name: N }>;
};

const BindingEventRequestSchema = Schema.Struct({
    name: Schema.String,
    metadata: Schema.Record(Schema.String, Schema.String),
    data: Schema.Uint8ArrayFromSelf,
});

export namespace BindingEventHandlerConfig {
    export function decoder<N extends string, I>(name: N, schema: Schema.Schema<I, Uint8Array>): Schema.Schema<I, BindingEventRequest_ & { name: N }>{
        const struct = Schema.Struct({
            ...BindingEventRequestSchema.fields,
            name: Schema.Literal(name),
        });

        return Schema.transform(
            struct,
            schema,
            {
                decode: (a) => a.data,
                encode: (a) => a,
                strict: false,
            },
        );
    }

    export function make<N extends string, I, Err extends Error = Error>(name: N, schema: Schema.Schema<I, Uint8Array>, handler: BindingEventHandler<I, Err>) {
        return {
            name,
            handler,
            decode: decoder(name, schema),
        } satisfies BindingEventHandlerConfig<N, I, Err>;
    }

    export function toImplementation<C extends Record<string, BindingEventHandlerConfig<any, any, any>>>(config: C): AppCallbackServiceImplementation["onBindingEvent"] {
        return async (req, ctx) => {
            console.log("received binding event", req);
            const def = Struct.get(req.name)(config);
            if (def) {
                const result = Schema.decodeEither(def.decode)(req);
                if (Either.isRight(result)) {
                    return await Effect.runPromise(def.handler(result.right, ctx));
                }
            }

            return BindingEventResponse.create({});
        }
    }
}
