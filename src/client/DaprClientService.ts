import { PACKAGE_NAME } from "../constants.js";
import { DaprClient } from "../proto/dapr/proto/runtime/v1/dapr.js";

import { Effect, Context, Layer } from "effect";
import DaprClientRawService from "./DaprClientRawService.js";
import { Channel } from "nice-grpc";
import { Channel_CreateError, Channel_InvalidAddressError, NiceEffect } from "./NiceEffect.js";

type DC = {
    [K in keyof Pick<DaprClient, "getMetadata">]: (...args: Parameters<DaprClient[K]>) => Effect.Effect<Awaited<ReturnType<DaprClient[K]>>, Error, DaprClientRawService> 
};

export const Tag = Context.Tag(`${PACKAGE_NAME}/client/DaprClientService`)<
    DaprClientService,
    DC
>();

export class DaprClientService extends Tag {}

export default DaprClientService;

export class DaprClientConfig extends Context.Tag(`${PACKAGE_NAME}/client/DaprClientConfig`)<
    DaprClientConfig,
    {
        readonly getConfig: Effect.Effect<{ channel: Channel }, Channel_InvalidAddressError | Channel_CreateError, NiceEffect>;
    }
>() {}

export const ConfigLive = Layer.succeed(DaprClientConfig, DaprClientConfig.of({
    getConfig: Effect.gen(function* ($) {
        const nice = yield* NiceEffect;
        const channel = yield* nice.createChannel("localhost:" + process.env["DAPR_GRPC_PORT"]);
        return { channel };
    }
}))
