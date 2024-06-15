import { DaprDefinition } from "./proto/dapr/proto/runtime/v1/dapr.js";
import { createChannel, createClient } from "nice-grpc";

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

const response = await client.getMetadata({});

console.log("response", response);
