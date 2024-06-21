import { Console, Effect, Layer, Option, Schedule } from "effect";
import {
    AppCallbackDefinition,
    AppCallbackHealthCheckDefinition,
    BindingEventRequest,
    BindingEventResponse,
} from "../proto/dapr/proto/runtime/v1/appcallback.js";
import { NiceEffect, NiceEffectLive } from "../grpc/NiceEffect.js";
import { AppCallbackService, toImplementation } from "./AppCallbackService.js";
import { AppCallbackHealthCheckService, AppCallbackHealthCheckServiceLive } from "./AppCallbackHealthCheckService.js";
import { BindingEventHandler, BindingEventHandlerConfig } from "./BindingEvent.js";
import { Schema } from "@effect/schema";

const app = Effect.gen(function* (_) {
    const nice = yield* NiceEffect;
    const callbackService = yield* AppCallbackService;
    const healthcheckService = yield* Effect.serviceOption(AppCallbackHealthCheckService);

    const rawServer = yield* nice.createServer();

    rawServer.add(AppCallbackDefinition, callbackService);

    if (Option.isSome(healthcheckService)) {
        rawServer.add(AppCallbackHealthCheckDefinition, healthcheckService.value);
    }

    return yield* Effect.tryPromise(() => rawServer.listen("localhost:50001")).pipe(
        Effect.map(() => rawServer),
    );
});

const foo = toImplementation({
    bindings: {
        foo: BindingEventHandlerConfig.make("mycron", Schema.Uint8ArrayFromSelf, (req, ctx) => Effect.gen(function* (_) {
            console.log("this is where we are");
            return BindingEventResponse.create({});
        })),
    },
    methods: {},
    topics: {},
});

const AppCallbackServiceLive = Layer.succeed(AppCallbackService, foo);

const runnable = Effect.provide(
    app,
    NiceEffectLive.pipe(
        Layer.provideMerge(AppCallbackServiceLive),
        Layer.provideMerge(AppCallbackHealthCheckServiceLive),
    ),
);

await Effect.runPromise(runnable);
