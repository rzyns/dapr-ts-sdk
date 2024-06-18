import { Args, Command, Options } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Console, Effect } from "effect";

const host = Options.text("host");
const port = Options.float("port").pipe(Options.withAlias("p"));
const address = Options.text("address").pipe(
    Options.withAlias("a"),
    // Options.withSchema()
);

const command = Command.make("app", { host, port }, (args) => Console.log(`Connecting to ${args.host}:${args.port}`));

const cli = Command.run(command, {
    name: "app",
    version: "v0.0.1",
});
cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain);
