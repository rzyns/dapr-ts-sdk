import { Channel } from "nice-grpc";
import { PACKAGE_NAME } from "../constants.js";
import { Context } from "effect";

export const Tag = Context.Tag(`${PACKAGE_NAME}/client/ChannelService`)<
    ChannelService,
    Channel
>();

export class ChannelService extends Tag {}

export default ChannelService;
