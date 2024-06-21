import { Config, ConfigProvider, Context, Effect, Layer } from "effect";
import { DaprDefinition } from "./proto/dapr/proto/runtime/v1/dapr.js";
import { createChannel, createClient } from "nice-grpc";
import DaprClientService, { DaprClientServiceLive } from "./client/DaprClientService.js";
import { DefaultImplementation, NiceEffect, NiceEffectLive } from "./grpc/NiceEffect.js";
import { DaprGrpcChannelServiceLive } from "./client/DaprGrpcChannelService.js";

const DAPR_GRPC_PORT = process.env["DAPR_GRPC_PORT"];
if (DAPR_GRPC_PORT == null) {
    throw new Error("DAPR_GRPC_PORT is not defined");
}

const DAPR_HTTP_PORT = process.env["DAPR_HTTP_PORT"];
if (DAPR_HTTP_PORT == null) {
    throw new Error("DAPR_HTTP_PORT is not defined");
}

const DAPR_METRICS_PORT = process.env["DAPR_METRICS_PORT"];
if (DAPR_METRICS_PORT == null) {
    throw new Error("DAPR_METRICS_PORT is undefined");
}

const channel = createChannel("localhost:" + DAPR_GRPC_PORT);
const client = createClient(DaprDefinition, channel);

class Foo extends Context.Tag("foo")<Foo, {}>() {}

const foo = Effect.gen(function* ($) {
    const nice = yield* NiceEffect;
    const channel = yield* nice.createChannel("localhost:" + DAPR_GRPC_PORT);
    const svc = yield* nice.createClient(DaprDefinition, channel);
});

const program = Effect.gen(function* () {
    const client = yield* DaprClientService;
    const result = yield* client.getMetadata({})
    console.log("result", result);
});

const MainLive = DaprClientServiceLive.pipe(
    Layer.provideMerge(DaprGrpcChannelServiceLive),
    Layer.provideMerge(NiceEffectLive),
);

const runnable = program.pipe(
    Effect.provide(MainLive),
)

Effect.runPromise(runnable);
