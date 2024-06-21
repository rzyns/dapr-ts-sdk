import { Context, Effect, Either, Layer } from "effect";
import { AppCallbackAlphaServiceImplementation, AppCallbackServiceImplementation, BindingEventResponse, TopicEventResponse } from "../proto/dapr/proto/runtime/v1/appcallback.js";
import { PACKAGE_NAME } from "../constants.js";
import { BindingEventHandler, BindingEventHandlerConfig } from "./BindingEvent.js";
import { TopicEventHandler, TopicEventHandlerConfig } from "./TopicEvent.js";
import { InvokeHandler, InvokeConfig, InvokeHandlerConfig } from "./Invoke.js";
import { InvokeResponse } from "../proto/dapr/proto/common/v1/common.js";
import { Schema } from "@effect/schema";

export type AppCallbackServiceConfig<Bindings extends string[], Topics extends string[], Methods extends string[]> = {
    bindings: Bindings;
    topics: Topics;
} & {
    [K in Bindings[number]]: BindingEventHandler<BindingEventResponse>;
} & {
    [K in Topics[number]]: TopicEventHandler<K, TopicEventResponse>;
} & {
    [K in Methods[number]]: InvokeHandler<K, InvokeResponse>;
};

type AppConfig<
    out Bindings extends Record<string, BindingEventHandlerConfig<any, any, any>>,
    out Topics extends Record<string, TopicEventHandlerConfig<any, any, any, any>>,
    out Methods extends Record<string, InvokeHandlerConfig<any, any, any, any>>
> = {
    bindings: Bindings,
    topics: Topics,
    methods: Methods,
};

export function toImplementation<
    B extends Record<string, BindingEventHandlerConfig<any, any, any>>,
    T extends Record<string, TopicEventHandlerConfig<any, any, any, any>>,
    M extends Record<string, InvokeHandlerConfig<any, any, any, any>>
>(a: AppConfig<B, T, M>): AppCallbackServiceImplementation {
    return {
        listInputBindings: async (_req, ctx) => ({ bindings: Object.values(a.bindings).map((binding) => binding.name) }),
        listTopicSubscriptions: async (_req, ctx) => ({ subscriptions: TopicEventHandlerConfig.configToSubscriptions(a.topics) }),
        onBindingEvent: BindingEventHandlerConfig.toImplementation(a.bindings),
        onInvoke: InvokeConfig.toImplementation(a.methods),
        onTopicEvent: TopicEventHandlerConfig.toImplementation(a.topics),
    };
}

export class AppCallbackService extends Context.Tag(`${PACKAGE_NAME}/app/AppCallbackService`)<
    AppCallbackService,
    AppCallbackServiceImplementation
>() {}

export function make<A extends AppConfig<any, any, any>>(config: A): A {
    return config satisfies typeof config;
}

export const AppCallbackServiceLive = Layer.succeed(AppCallbackService, toImplementation({
    bindings: {
        foo: BindingEventHandlerConfig.make(
            "mycron",
            Schema.Uint8ArrayFromSelf,
            (req, ctx) => Effect.succeed(BindingEventResponse.create({})),
        )
    },
    methods: {},
    topics: {},
}));

export class AppCallbackAlphaService extends Context.Tag(`${PACKAGE_NAME}/app/AppCallbackAlphaService`)<
    AppCallbackAlphaService,
    AppCallbackAlphaServiceImplementation
>() {}

export const AppCallbackAlphaServiceLive = Layer.succeed(AppCallbackAlphaService, AppCallbackAlphaService.of({
    onBulkTopicEventAlpha1: async (req, ctx) => ({ }),
}));
