import { Server } from "server";
import config from "../../config.json";
import { SLDBClient, SLDBModel } from "sldbts";

declare const __IS_DEV__: boolean;

(async () => {
    const server = new Server({ port: config.serverPort, isDev: __IS_DEV__ });

    const client = new SLDBClient({
        host: config.sldbXmlrpcHost,
        port: config.sldbXmlrpcPort,
        username: config.sldbXmlrpcUsername,
        password: config.sldbXmlrpcPassword,
    });

    let leaderboards: SLDBModel.LeaderboardResult[] = [];

    leaderboards = await client.getLeaderboards(config.gameName, config.leaderboards as SLDBModel.GameType[]);

    setInterval(async () => {
        leaderboards = await client.getLeaderboards(config.gameName, config.leaderboards as SLDBModel.GameType[]);
        console.log("Updated leaderboards");
    }, config.pollInterval);

    server.app.get("/", async (req, res) => {
        res.render("index", { leaderboards });
    });

    await server.start();
})();