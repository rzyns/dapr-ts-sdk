
import { Context, Layer } from "effect";
import { AppCallbackHealthCheckServiceImplementation } from "../proto/dapr/proto/runtime/v1/appcallback.js";
import { PACKAGE_NAME } from "../constants.js";

export class AppCallbackHealthCheckService extends Context.Tag(`${PACKAGE_NAME}/app/AppCallbackHealthCheckService`)<
    AppCallbackHealthCheckService,
    AppCallbackHealthCheckServiceImplementation
>() {}

export const AppCallbackHealthCheckServiceLive = Layer.succeed(AppCallbackHealthCheckService, AppCallbackHealthCheckService.of({
    healthCheck: async (_req, ctx) => {
        return {};
    },
}))
