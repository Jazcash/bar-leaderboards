import { DataFetcher } from "data-fetcher";
import { Server } from "server";
import config from "../../config.json";

declare const __IS_DEV__: boolean;

console.log("isDev", __IS_DEV__);

(async () => {
    const dataFetcher = new DataFetcher(config);
    
    await dataFetcher.listen();

    console.log("ready!");

    dataFetcher.onLeaderboardsUpdated.addOnce(async () => {
        console.log("leaderboards updated!");

        const server = new Server({ port: 3456, isDev: __IS_DEV__ });

        server.app.get("/", async (req, res) => {
            const leaderboards = dataFetcher.getLeaderboards();
            res.render("index", { leaderboards });
        });

        await server.start();

        console.log("server listening updated!");
    });
})();