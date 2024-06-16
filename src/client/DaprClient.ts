import { Effect, Context } from "effect";
import { CallOptions } from "nice-grpc-common";
import { DaprClientService } from "./DaprClientService.js";
import DaprClientRawService from "./DaprClientRawService.js";

export const make = () => new DaprClient();

export default class DaprClient implements Context.Tag.Service<DaprClientService> {
    getMetadata(request: {}, _options?: CallOptions | undefined) {
        return Effect.gen(this, function* ($) {
            const client = yield* DaprClientRawService;

            const result = yield* $(Effect.tryPromise({
                try: (_signal) => {
                    return client.getMetadata(request);
                },
                catch: (error) => {
                    return new Error(`Failed`, { cause: error });
                },
            }));

            return result;
        });
    }
}
