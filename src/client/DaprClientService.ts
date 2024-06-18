import { PACKAGE_NAME } from "../constants.js";
import { DaprClient, DaprDefinition } from "../proto/dapr/proto/runtime/v1/dapr.js";
import * as nice from "nice-grpc";
import { Effect, Context, Layer, Stream } from "effect";
import { NiceEffect } from "../grpc/NiceEffect.js";
import ChannelService from "./ChannelService.js";
import { UnknownException } from "effect/Cause";

type DC = {
    [K in keyof DaprClient]: (...args: Parameters<DaprClient[K]>) => Awaited<ReturnType<DaprClient[K]>> extends AsyncIterable<infer T>
        ? Stream.Stream<T, nice.ClientError | UnknownException>
        : Effect.Effect<Awaited<ReturnType<DaprClient[K]>>, nice.ClientError | UnknownException> 
};

export const Tag = Context.Tag(`${PACKAGE_NAME}/client/DaprClientService`)<
    DaprClientService,
    EffectyClient<nice.Client<DaprDefinition>>
>();

export class DaprClientService extends Tag {}

export default DaprClientService;

type Effectify<T, E = never> = T extends (...args: infer A) => infer R ? (...args: A) => R extends AsyncIterable<infer S> ? Stream.Stream<S, nice.ClientError | UnknownException> : Effect.Effect<Awaited<R>, E> : T;
type EffectyClient<Service extends nice.Client<any>> = {
    [K in keyof Service]: Effectify<Service[K], nice.ClientError>;
}

function wrap<Fn extends (...args: any[]) => any>(fn: Fn): (...args: Parameters<Fn>) => Effect.Effect<Awaited<ReturnType<Fn>>, nice.ClientError | UnknownException> {
    return (...args) => Effect.tryPromise({
        try: () => fn(...args),
        catch: (e) => e instanceof nice.ClientError ? e : new UnknownException({ cause: e }),
    });
}

function wrapStream<A extends any[], B, Fn extends (...args: A) => AsyncIterable<B>>(fn: Fn): (...args: A) => Stream.Stream<B, nice.ClientError | UnknownException> {
    return (...args: A) => Stream.fromAsyncIterable(fn(...args), (e) => e instanceof nice.ClientError ? e : new UnknownException({ cause: e }));
}

function wrapClient<Def extends nice.TsProtoServiceDefinition, Client extends nice.Client<Def>>(client: Client, definition: Def): EffectyClient<Client> {
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

export const DaprClientServiceLive = Layer.effect(
    DaprClientService,
    Effect.gen(function* ($) {
        const nice      = yield* NiceEffect;
        const channel   = yield* ChannelService;
        const rawClient = yield* nice.createClient(DaprDefinition, channel);

        return wrapClient(rawClient, DaprDefinition);
        // return {
        //     subscribeConfiguration: wrapStream(rawClient.subscribeConfiguration),
        //     subscribeConfigurationAlpha1: wrapStream(rawClient.subscribeConfigurationAlpha1),
        //     subscribeTopicEventsAlpha1: wrapStream(rawClient.subscribeTopicEventsAlpha1),
        //     decryptAlpha1: wrapStream(rawClient.decryptAlpha1),
        //     encryptAlpha1: wrapStream(rawClient.encryptAlpha1),

        //     bulkPublishEventAlpha1:         wrap(rawClient.bulkPublishEventAlpha1),
        //     deleteBulkState:                wrap(rawClient.deleteBulkState),
        //     deleteState:                    wrap(rawClient.deleteState),
        //     executeActorStateTransaction:   wrap(rawClient.executeActorStateTransaction),
        //     executeStateTransaction:        wrap(rawClient.executeStateTransaction),
        //     getActorState:                  wrap(rawClient.getActorState),
        //     getBulkSecret:                  wrap(rawClient.getBulkSecret),
        //     getBulkState:                   wrap(rawClient.getBulkState),
        //     getConfiguration:               wrap(rawClient.getConfiguration),
        //     getConfigurationAlpha1:         wrap(rawClient.getConfigurationAlpha1),
        //     getMetadata:                    wrap(rawClient.getMetadata),
        //     getSecret:                      wrap(rawClient.getSecret),
        //     getState:                       wrap(rawClient.getState),
        //     getWorkflowAlpha1:              wrap(rawClient.getWorkflowAlpha1),
        //     getWorkflowBeta1:               wrap(rawClient.getWorkflowBeta1),
        //     invokeActor:                    wrap(rawClient.invokeActor),
        //     invokeBinding:                  wrap(rawClient.invokeBinding),
        //     invokeService:                  wrap(rawClient.invokeService),
        //     pauseWorkflowAlpha1:            wrap(rawClient.pauseWorkflowAlpha1),
        //     pauseWorkflowBeta1:             wrap(rawClient.pauseWorkflowBeta1),
        //     publishEvent:                   wrap(rawClient.publishEvent),
        //     purgeWorkflowAlpha1:            wrap(rawClient.purgeWorkflowAlpha1),
        //     purgeWorkflowBeta1:             wrap(rawClient.purgeWorkflowBeta1),
        //     queryStateAlpha1:               wrap(rawClient.queryStateAlpha1),
        //     raiseEventWorkflowAlpha1:       wrap(rawClient.raiseEventWorkflowAlpha1),
        //     raiseEventWorkflowBeta1:        wrap(rawClient.raiseEventWorkflowBeta1),
        //     registerActorReminder:          wrap(rawClient.registerActorReminder),
        //     registerActorTimer:             wrap(rawClient.registerActorTimer),
        //     resumeWorkflowAlpha1:           wrap(rawClient.resumeWorkflowAlpha1),
        //     resumeWorkflowBeta1:            wrap(rawClient.resumeWorkflowBeta1),
        //     saveState:                      wrap(rawClient.saveState),
        //     setMetadata:                    wrap(rawClient.setMetadata),
        //     shutdown:                       wrap(rawClient.shutdown),
        //     startWorkflowAlpha1:            wrap(rawClient.startWorkflowAlpha1),
        //     startWorkflowBeta1:             wrap(rawClient.startWorkflowBeta1),
        //     subtleDecryptAlpha1:            wrap(rawClient.subtleDecryptAlpha1),
        //     subtleEncryptAlpha1:            wrap(rawClient.subtleEncryptAlpha1),
        //     subtleGetKeyAlpha1:             wrap(rawClient.subtleGetKeyAlpha1),
        //     subtleSignAlpha1:               wrap(rawClient.subtleSignAlpha1),
        //     subtleUnwrapKeyAlpha1:          wrap(rawClient.subtleUnwrapKeyAlpha1),
        //     subtleVerifyAlpha1:             wrap(rawClient.subtleVerifyAlpha1),
        //     subtleWrapKeyAlpha1:            wrap(rawClient.subtleWrapKeyAlpha1),
        //     terminateWorkflowAlpha1:        wrap(rawClient.terminateWorkflowAlpha1),
        //     terminateWorkflowBeta1:         wrap(rawClient.terminateWorkflowBeta1),
        //     tryLockAlpha1:                  wrap(rawClient.tryLockAlpha1),
        //     unlockAlpha1:                   wrap(rawClient.unlockAlpha1),
        //     unregisterActorReminder:        wrap(rawClient.unregisterActorReminder),
        //     unregisterActorTimer:           wrap(rawClient.unregisterActorTimer),
        //     unsubscribeConfiguration:       wrap(rawClient.unsubscribeConfiguration),
        //     unsubscribeConfigurationAlpha1: wrap(rawClient.unsubscribeConfigurationAlpha1),
        // };
    }),
);
