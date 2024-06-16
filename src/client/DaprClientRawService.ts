
import { PACKAGE_NAME } from "../constants.js";
import { DaprClient } from "../proto/dapr/proto/runtime/v1/dapr.js";
import { Context } from "effect";

export const Tag = Context.Tag(`${PACKAGE_NAME}/client/DaprClientRawService`)<
    DaprClientRawService,
    DaprClient
>();

export class DaprClientRawService extends Tag {}

export default DaprClientRawService;
