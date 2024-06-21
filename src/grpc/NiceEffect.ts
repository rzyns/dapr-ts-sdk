import { Cause, Context, Data, Effect, Layer, Stream } from "effect";
import * as nice from "nice-grpc";
import * as constants from "../constants.js";

export interface NiceEffectInterface {
    readonly createChannel: typeof createChannel;
    readonly createClient: typeof createClient;
    readonly createServer: typeof createServer;
    readonly waitForChannelReady: typeof waitForChannelReady;
    readonly wrap: typeof wrap;
    readonly wrapStream: typeof wrapStream;
    readonly wrapClient: typeof wrapClient;
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

export function createClient<Service extends nice.TsProtoServiceDefinition>(
    definition: Service,
    channel: nice.Channel,
    defaultCallOptions?: nice.DefaultCallOptions<nice.NormalizedServiceDefinition<Service>>,
): Effect.Effect<EffectifyClient<nice.Client<Service>>, Client_CreateError> {
    return Effect.try({
        try: () => wrapClient(nice.createClient(definition, channel, defaultCallOptions), definition),
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

export type Effectify<T, E = never> = T extends (...args: infer A) => infer R ? (...args: A) => R extends AsyncIterable<infer S> ? Stream.Stream<S, nice.ClientError | Cause.UnknownException> : Effect.Effect<Awaited<R>, E> : T;
export type EffectifyClient<Service extends nice.Client<any>> = {
    [K in keyof Service]: Effectify<Service[K], nice.ClientError>;
}

export function wrap<Fn extends (...args: any[]) => any>(fn: Fn): (...args: Parameters<Fn>) => Effect.Effect<Awaited<ReturnType<Fn>>, nice.ClientError | Cause.UnknownException> {
    return (...args) => Effect.tryPromise({
        try: () => fn(...args),
        catch: (e) => e instanceof nice.ClientError ? e : new Cause.UnknownException({ cause: e }),
    });
}

export function wrapStream<A extends any[], B, Fn extends (...args: A) => AsyncIterable<B>>(fn: Fn): (...args: A) => Stream.Stream<B, nice.ClientError | Cause.UnknownException> {
    return (...args: A) => Stream.fromAsyncIterable(fn(...args), (e) => e instanceof nice.ClientError ? e : new Cause.UnknownException({ cause: e }));
}

export function wrapClient<Def extends nice.TsProtoServiceDefinition, Client extends nice.Client<Def>>(client: Client, definition: Def): EffectifyClient<Client> {
    return new Proxy(client, {
        get(target, prop, receiver) {
            if (typeof prop === "string") {
                const fn = target[prop as keyof Client];
                if (definition["methods"][prop]?.responseStream) {
                    return wrapStream(fn as any);
                } else if (typeof fn === "function") {
                    return wrap(fn);
                }
            }

            return Reflect.get(target, prop, receiver);
        },
    }) as any;
}

export const DefaultImplementation: NiceEffectInterface = {
    createChannel,
    createClient,
    createServer,
    waitForChannelReady,
    wrap,
    wrapClient,
    wrapStream,
};

export const NiceEffectLive = Layer.succeed(NiceEffect, NiceEffect.of(DefaultImplementation));
