import {
    AppCallbackDefinition,
    AppCallbackHealthCheckDefinition,
    AppCallbackHealthCheckServiceImplementation,
    AppCallbackServiceImplementation,
} from "../proto/dapr/proto/runtime/v1/appcallback.js";
import {
} from "../proto/dapr/proto/runtime/v1/dapr.js";

import { createServer } from "nice-grpc";

const server = createServer();

server.add(AppCallbackDefinition, {
    listInputBindings: async (req, ctx) => {
        console.log("listInputBindings", req);
        return {};
    },
    listTopicSubscriptions: async (req, ctx) => {
        console.log("listTopicSubscriptions", req);
        return {};
    },
    onBindingEvent: async (req, ctx) => {
        console.log("onBindingEvent", req);
        return {};
    },
    onInvoke: async (req, ctx) => {
        console.log("onInvoke", req);
        return {};
    },
    onTopicEvent: async (req, ctx) => {
        console.log("onTopicEvent", req);
        return {};
    },
});

server.add(AppCallbackHealthCheckDefinition, {
    healthCheck: async (req, ctx) => {
        console.log("healthCheck", req);
        return {};
    },
});

await server.listen("localhost:50001");
