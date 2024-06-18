import { Channel } from "nice-grpc";
import { PACKAGE_NAME } from "../constants.js";
import { Config, Context, Effect, Layer } from "effect";
import { NiceEffect } from "../grpc/NiceEffect.js";

export const Tag = Context.Tag(`${PACKAGE_NAME}/client/ChannelService`)<
    ChannelService,
    Channel
>();

export class ChannelService extends Tag {}

export default ChannelService;

export const ChannelServiceLive = Layer.effect(ChannelService, Effect.gen(function* ($) {
    const port = yield* Config.integer("DAPR_GRPC_PORT");
    const host = yield* Config.string("DAPR_HOST");
    const nice = yield* NiceEffect;

    return yield* nice.createChannel(`${host}:${port}`);
}));
