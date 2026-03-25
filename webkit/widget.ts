import { callable } from "@steambrew/webkit";

const getStats = callable<[{ playerName: string }], any>("get_stats");
const writeCache = callable<[{ data: string }], any>("write_cache");

interface WidgetState {
    rank: string | null;
    rankImage: string | null;
    rankPoints: string | null;
    ubiName: string | null;
    error: string | null;
    rankedKd: string | null;
    rankedWinPercentage: string | null;
    unrankedKd: string | null;
    unrankedWinPercentage: string | null;
}

type CacheEntry = WidgetState & { timestamp: number };

export default class Widget {
    private state: WidgetState;
    private cache: Record<string, CacheEntry>;
    private userSlug: string | null;

    private container!: HTMLDivElement;
    private loader!: HTMLDivElement;
    private searchContainer!: HTMLDivElement;
    private input!: HTMLInputElement;
	private errorText!: HTMLSpanElement;
    private mainContent!: HTMLDivElement;
    private statsContainer!: HTMLDivElement;
    private rankImg!: HTMLImageElement;
    private rankText!: HTMLSpanElement;
    private rankPoints!: HTMLSpanElement;

    constructor(cache: Record<string, CacheEntry> = {}) {
        this.state = {
            rank: null,
            rankImage: null,
            rankPoints: null,
            ubiName: null,
            error: null,
            rankedKd: null,
            rankedWinPercentage: null,
            unrankedKd: null,
            unrankedWinPercentage: null
        };

        this.cache = cache;
        this.userSlug = this.getUserSlug();

		this.injectStyles();
        this.render();

        if (this.userSlug && this.isCacheValid(this.cache[this.userSlug])) {
            this.setState(this.cache[this.userSlug]);
            this.showResults();
        } else if (this.cache[this.userSlug]?.ubiName) {
            this.handleSubmit(this.cache[this.userSlug]?.ubiName);
        } else {
            this.showSearch();
        }
    }

    public getElement() {
        return this.container;
    }

    // ---------- Helpers ----------

    private getUserSlug(): string | null {
        return window.location.pathname.split("/")[2] || null;
    }

    private isCacheValid(entry?: CacheEntry): boolean {
        if (!entry) return false;
        return Date.now() - entry.timestamp < 1 * 60 * 60 * 1000;
    }

    private setState(newState: Partial<WidgetState>) {
        this.state = { ...this.state, ...newState };
    }

    private updateCache(userId: string, data: Partial<CacheEntry>) {
        this.cache[userId] = {
            ...this.cache[userId],
            ...data,
            timestamp: Date.now()
        } as CacheEntry;
    }

    // ---------- Core ----------

    private handleSubmit = async (name?: string) => {
        this.showLoader();

        const userName = name || this.input.value.trim();
        if (!userName) {
            this.setState({
                error: "Player name cannot be empty",
            });
            this.hideLoader();
			this.showSearch();
            return;
        }

		// 2 minute cooling period to prevent spamming API with multiple requests in a short time frame
		const cachedEntry = this.cache[this.userSlug || ""];
		if (cachedEntry && userName === cachedEntry?.ubiName && cachedEntry.timestamp > Date.now() - 2 * 60 * 1000) {			
			// Keep loader visible for a short time to indicate refresh
			setTimeout(() => {
				this.hideLoader();
				this.showResults();
			}, 100);
			return;
		}

        try {
            const raw = await getStats({ playerName: userName });
			
            let parsed = JSON.parse(raw);
			if (!parsed || !parsed.data || !parsed.data.segments  || parsed == null) throw new Error("An error occurred while fetching stats");

			if (parsed?.errors) {
				const errorMsg = parsed?.errors?.[0]?.message;
				throw new Error(errorMsg);
			}

			parsed = parsed.data;
            const stats = this.filterStats(parsed);

            const userId = this.userSlug;
            if (userId) {
                this.updateCache(userId, {
                    ...stats,
                    ubiName: userName
                });

                await writeCache({ data: JSON.stringify(this.cache) });
                this.setState(this.cache[userId]);
            } else {
                this.setState({ ...stats, ubiName: userName });
            }

            this.setState({ error: null });
            this.showResults();
        } catch (e: any) {
            this.setState({
                error: e.message || "Failed to fetch stats",
            });

			this.showSearch();
        }

        this.hideLoader();
    };

    private filterStats(stats: any) {
        const findMode = (mode: string) =>
            stats.segments.find(
                (s: any) =>
                    s.attributes?.gamemode === mode &&
                    s.type === "season"
            );

        const ranked = findMode("pvp_ranked");
        const casual = findMode("pvp_casual");

        return {
            rank: ranked?.stats?.rankPoints?.metadata?.name ?? null,
            rankImage: ranked?.stats?.rankPoints?.metadata?.imageUrl ?? null,
            rankPoints: ranked?.stats?.rankPoints?.displayValue ?? null,
            rankedKd: ranked?.stats?.kdRatio?.displayValue ?? null,
            rankedWinPercentage: ranked?.stats?.winPercentage?.displayValue ?? null,
            unrankedKd: casual?.stats?.kdRatio?.displayValue ?? null,
            unrankedWinPercentage: casual?.stats?.winPercentage?.displayValue ?? null
        };
    }

	// ---------- Styles ----------

	private injectStyles() {
		const style = document.createElement("style");
		style.textContent = `
		@keyframes spin {
			from { transform: rotate(0deg); }
			to { transform: rotate(360deg); }
		}`;
		document.head.appendChild(style);
	}

    // ---------- UI ----------

    private render() {
        this.container = document.createElement("div");
        this.container.id = "r6-stats-widget";
        this.container.style.cssText = `
            background-color: rgba(0, 0, 0, 0.3);
            padding: 8px;
            border-radius: 5px;
            margin: 9px 0;
            overflow: hidden;
        `;

        // Search
        this.searchContainer = document.createElement("div");
        this.searchContainer.style.cssText = `
            display: none;
            flex-direction: column;
            gap: 20px;
            align-items: center;
            justify-content: center;
			padding: 20px 0;
        `;

        this.input = document.createElement("input");
        this.input.type = "text";
        this.input.placeholder = "Enter Ubisoft Id";
        this.input.style.cssText = `
            padding: 6px;
            border-radius: 3px;
            border: none;
			outline: solid 1px rgba(255,255,255,0.3);
        `;

        const submitButton = document.createElement("button");
        submitButton.className = "btn_profile_action btn_medium";
        submitButton.style.cssText = `
            border: none;
            border-radius: 2px;
			color: lightgray !important;
			padding: 5px 10px;
			display: inline-block;
			text-decoration: none;
			cursor: pointer;
			background-color: var(--btn-background);
			transition: all 0.1s ease-in-out;
        `;
        submitButton.onclick = () => this.handleSubmit();
        submitButton.appendChild(document.createTextNode("Search"));

		this.errorText = document.createElement("span");
		this.errorText.style.cssText = `
			color: #ff4d4f;
			font-size: 12px;
			margin-top: 10px;
		`;
		this.searchContainer.append(this.errorText);

        this.searchContainer.append(this.input, submitButton);

        // Loader
        this.loader = document.createElement("div");
        this.loader.style.cssText = `
            border: 4px solid rgba(255,255,255,0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
            display: none;
        `;

        // Main content
        this.mainContent = document.createElement("div");
        this.mainContent.style.display = "none";

        const actions = document.createElement("div");
        actions.style.cssText = `
            display: flex;
            justify-content: space-between;
            font-size: 10px;
        `;

        const refresh = document.createElement("span");
        refresh.textContent = "Refresh";
		refresh.style.cursor = "pointer";
        refresh.onclick = () => this.handleSubmit(this.state.ubiName || undefined);

        const change = document.createElement("span");
        change.textContent = "Change user";
		change.style.cursor = "pointer";
        change.onclick = () => this.showSearch();

        actions.append(refresh, change);

		const rankContainer = document.createElement("div");
		rankContainer.style.cssText = `
			display: flex;
			flex-direction: column;
			align-items: center;
		`;

        this.rankImg = document.createElement("img");
        this.rankImg.style.width = "150px";
        this.rankImg.style.cursor = "pointer";

        this.rankText = document.createElement("span");
        this.rankText.style.cssText = `
            font-size: 16px;
            font-weight: bold;
            color: white;
            margin-top: 10px;
        `;

        this.rankPoints = document.createElement("span");
        this.rankPoints.style.cssText = `
            font-size: 12px;
            color: white;
            margin-bottom: 10px;
        `;

		rankContainer.append(this.rankImg, this.rankText, this.rankPoints);

        this.statsContainer = document.createElement("div");
        this.statsContainer.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 10px;
        `;

        this.mainContent.append(actions, rankContainer, this.statsContainer);
        this.container.append(this.loader, this.searchContainer, this.mainContent);
    }

    private createStatElement(label: string, value: string | null) {
        const el = document.createElement("div");
        el.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
        `;

        const l = document.createElement("span");
        l.textContent = label;
        l.style.fontSize = "12px";
        l.style.color = "white";

        const v = document.createElement("span");
        v.textContent = value ?? "--";
        v.style.cssText = `
            font-size: 14px;
            font-weight: bold;
            color: white;
        `;

        el.append(l, v);
        return el;
    }

    private showLoader() {
        this.loader.style.display = "block";
        this.searchContainer.style.display = "none";
        this.mainContent.style.display = "none";
    }

    private hideLoader() {
        this.loader.style.display = "none";
    }

    private showResults() {
        this.rankText.textContent = this.state.rank || "Unranked";
        this.rankImg.src =
            this.state.rankImage?.replace("small/", "") ||
            "https://trackercdn.com/cdn/r6.tracker.network/ranks/s28/unranked.png";
        if (this.state.ubiName) {
            this.rankImg.onclick = () => {
                const url = `https://r6.tracker.network/r6siege/profile/ubi/${this.state.ubiName}`;
                window.open(url, "_self");
            }
        }
        this.rankPoints.textContent = this.state.rankPoints != null ? `${this.state.rankPoints} RP` : "";

        this.statsContainer.replaceChildren(
            this.createStatElement("Ranked K/D", this.state.rankedKd),
            this.createStatElement("Ranked Win %", this.state.rankedWinPercentage),
            this.createStatElement("Unranked K/D", this.state.unrankedKd),
            this.createStatElement("Unranked Win %", this.state.unrankedWinPercentage)
        );

        this.mainContent.style.display = "grid";
        this.searchContainer.style.display = "none";
    }

    private showSearch() {
        this.input.value = "";
        this.mainContent.style.display = "none";
        this.searchContainer.style.display = "flex";
		this.errorText.style.display = "none";

		if (this.state.error) {
			this.errorText.textContent = this.state.error;
			this.errorText.style.display = "block";
			this.state.error = null; // Clear error after displaying
		}
    }
}