import {
    Context,
    Data,
    Effect,
} from "effect";
import * as nice from "nice-grpc";
import * as constants from "../constants.js";

export interface NiceEffectInterface {
    readonly createChannel: typeof createChannel;
    readonly createClient: typeof createClient;
    readonly createServer: typeof createServer;
    readonly waitForChannelReady: typeof waitForChannelReady;
}

export { composeClientMiddleware, composeServerMiddleware } from "nice-grpc";

export const Tag = Context.Tag(`${constants.PACKAGE_NAME}/client/NiceEffect`)<
    NiceEffect,
    NiceEffectInterface
>();

export class NiceEffect extends Tag { }

export class Channel_InvalidAddressError extends Data.TaggedError("Channel_InvalidAddressError")<{
    message: string;
    address: string;
    cause: unknown;
}> { }

export class Channel_CreateError extends Data.TaggedError("Channel_CreateError")<{
    message: string;
    address: string;
    cause: unknown;
}> { }

export function createChannel(
    address: string,
    credentials?: nice.ChannelCredentials,
    options?: nice.ChannelOptions,
): Effect.Effect<nice.Channel, Channel_InvalidAddressError | Channel_CreateError> {
    return Effect.try({
        try: () => nice.createChannel(address, credentials, options),
        catch: (error) => {
            if (error instanceof Error && error.message.toLowerCase().startsWith("invalid address")) {
                return new Channel_InvalidAddressError({
                    message: `Invalid address: ${address}`,
                    address,
                    cause: error,
                });
            }

            return new Channel_CreateError({
                message: "Error creating channel",
                address,
                cause: error,
            });
        }
    });
}

export class Client_CreateError extends Data.TaggedError("Client_CreateError")<{
    message: string;
    cause: unknown;
}> { }

export function createClient<Service extends nice.CompatServiceDefinition>(
    definition: Service,
    channel: nice.Channel,
    defaultCallOptions?: nice.DefaultCallOptions<nice.NormalizedServiceDefinition<Service>>,
): Effect.Effect<nice.Client<Service>, Client_CreateError> {
    return Effect.try({
        try: () => nice.createClient(definition, channel, defaultCallOptions),
        catch: (error) => new Client_CreateError({ cause: error, message: "Error creating client" })
    });
}

export class Server_CreateError extends Data.TaggedError("Server_CreateError")<{
    message: string;
    cause: unknown;
    options: nice.ChannelOptions | undefined | null;
}> { }

export function createServer(options?: nice.ChannelOptions): Effect.Effect<nice.Server, Server_CreateError> {
    return Effect.try({
        try: () => nice.createServer(options),
        catch: (error) => new Server_CreateError({ message: "Error creating server", cause: error, options }),
    });
}

export class WaitForChannelReadyError extends Data.TaggedError("WaitForChannelReadyError")<{
    message: string;
    cause: unknown;
}> { }

export function waitForChannelReady(channel: nice.Channel, deadline: Date): Effect.Effect<void, WaitForChannelReadyError> {
    return Effect.tryPromise({
        try: () => nice.waitForChannelReady(channel, deadline),
        catch: (error) => new WaitForChannelReadyError({ message: "Error waiting for channel", cause: error }),
    });
}

export type ClientFactory<CallOptionsExt = {}> = {
    use<Ext>(middleware: nice.ClientMiddleware<Ext, CallOptionsExt>): ClientFactory<CallOptionsExt & Ext>;
    create<Service extends nice.CompatServiceDefinition>(
        definition: Service,
        channel: nice.Channel,
        defaultCallOptions?: nice.DefaultCallOptions<nice.NormalizedServiceDefinition<Service>, CallOptionsExt>
    ): Effect.Effect<nice.Client<Service, CallOptionsExt>, Client_CreateError>;
};

function _createClientFactoryWithMiddleware<A, CallOptionsExt = {}>(factory: nice.ClientFactory<CallOptionsExt>, middleware?: nice.ClientMiddleware<A, CallOptionsExt>): ClientFactory<A & CallOptionsExt> {
    const newFactory = middleware ?  factory.use(middleware) : factory;
    return {
        use: (a) => _createClientFactoryWithMiddleware(newFactory, a),
        create: <Service extends nice.CompatServiceDefinition>(definition: Service, channel: nice.Channel, defaultCallOptions?: nice.DefaultCallOptions<nice.NormalizedServiceDefinition<Service>, A & CallOptionsExt>) =>
            Effect.try({
                try: () => newFactory.create(definition, channel, defaultCallOptions),
                catch: (error) => new Client_CreateError({ cause: error, message: "Error creating client" })
            }),
    };
}

export function createClientFactory(): ClientFactory {
    return _createClientFactoryWithMiddleware(nice.createClientFactory());
}

export const DefaultImplementation: NiceEffectInterface = {
    createChannel,
    createClient,
    createServer,
    waitForChannelReady,
};
