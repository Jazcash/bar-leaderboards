import { Player } from "common/model/player";
import { Signal } from "common/utils/signal";
import { SpringLobbyProtocolClient } from "sluts";
import { delay } from "utils";

export interface DataFetcherConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    sldbUsername: string;
    gameName: string;
    leaderboards: string[];
    pollInterval?: number;
}

const defaultDataFetcherConfig: Partial<DataFetcherConfig> = {
    pollInterval: 10000
};

export class DataFetcher {
    public onLeaderboardsUpdated: Signal = new Signal();

    protected config: DataFetcherConfig;
    protected slpClient: SpringLobbyProtocolClient;
    protected players: Player[] = [];
    protected leaderboards: { [key: string]: Player[] } = {};
    protected pollInterval?: NodeJS.Timeout;

    constructor(config: DataFetcherConfig) {
        this.config = Object.assign({}, defaultDataFetcherConfig, config);
        this.slpClient = new SpringLobbyProtocolClient();

        for (const leaderboardId of this.config.leaderboards) {
            this.leaderboards[leaderboardId] = [];
        }
    }

    public async listen() {
        await this.slpClient.connect(this.config.host, this.config.port);

        const loginResponse = await this.slpClient.login(this.config.username, this.config.password);
        if (!loginResponse.success) {
            console.log(loginResponse.error);
            return;
        }

        await this.slpClient.say("SLDB", "!set ircColors 0");

        this.updateLeaderboards();
    }

    public getLeaderboards() : { [key: string]: Player[] } {
        return this.leaderboards;
    }

    protected async updateLeaderboards() : Promise<void> {
        for (const leaderboardId of this.config.leaderboards) {
            this.leaderboards[leaderboardId] = await this.getLeaderboard(leaderboardId);
            console.log(`Updated ${leaderboardId}!`);
        }

        this.onLeaderboardsUpdated.dispatch();

        await delay(this.config.pollInterval!);

        await this.updateLeaderboards();
    }

    protected getLeaderboard(leaderboardId: string) : Promise<Player[]> {
        return new Promise(resolve => {
            let players: Player[];
            let playersIncoming = false;

            const messageReceivedBinding = this.slpClient.onResponse("SAIDPRIVATE").add(({userName, message}) => {
                if (userName !== "SLDB"){
                    return;
                }
    
                if (message.slice(0, 4) === "====") {
                    playersIncoming = false;
                    messageReceivedBinding.destroy();
                    resolve(players);
                }
        
                if (playersIncoming) {
                    const player = this.parsePlayer(message);
                    players.push(player);
                }
        
                if (message.slice(0, 4) === "----"){
                    playersIncoming = true;
                    players = [];
                }
            });

            this.slpClient.request("SAYPRIVATE", {
                userName: this.config.sldbUsername,
                message: `!leaderboard ${this.config.gameName} ${leaderboardId}`
            });
        });
    }

    protected parsePlayer(playerString: string) : Player {
        const parts = playerString.split(/\s+/);
        parts.pop();
    
        return {
            rank: parseInt(parts[0]),
            userId: parseInt(parts[1]),
            name: parts[2],
            inactivity: parseInt(parts[3]),
            trustedSkill: parseFloat(parts[4]),
            estimatedSkill: parseFloat(parts[5]),
            uncertainty: parseFloat(parts[6])
        };
    }
}