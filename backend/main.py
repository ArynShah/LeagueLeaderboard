import os
import json
import time
import asyncio
from pathlib import Path
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from cachetools import TTLCache

load_dotenv()

API_KEY = os.getenv("RIOT_API_KEY", "").strip()
REGION = os.getenv("RIOT_REGION", "na1").strip()
ROUTING = os.getenv("RIOT_ROUTING", "americas").strip()

HEADERS = {"X-Riot-Token": API_KEY}
DDRAGON_VERSION = "16.21.1"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cache = TTLCache(maxsize=150, ttl=180)
match_raw_cache = TTLCache(maxsize=1000, ttl=86400)
rate_sem = asyncio.Semaphore(6)

async def update_ddragon_version():
    global DDRAGON_VERSION
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get("https://ddragon.leagueoflegends.com/api/versions.json")
            if res.status_code == 200:
                versions = res.json()
                if versions and isinstance(versions, list):
                    DDRAGON_VERSION = versions[0]
    except Exception:
        pass

@app.on_event("startup")
async def on_startup():
    await update_ddragon_version()

HISTORY_FILE = Path(__file__).resolve().parent / "lp_history.json"

def load_history():
    if HISTORY_FILE.exists():
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_history(history):
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        print(f"Error saving history: {e}")

TIER_ORDER = {
    "CHALLENGER": 900000,
    "GRANDMASTER": 800000,
    "MASTER": 700000,
    "DIAMOND": 600000,
    "EMERALD": 500000,
    "PLATINUM": 400000,
    "GOLD": 300000,
    "SILVER": 200000,
    "BRONZE": 100000,
    "IRON": 0,
    "UNRANKED": -100000,
}

DIVISION_ORDER = {
    "I": 3000,
    "II": 2000,
    "III": 1000,
    "IV": 0,
}

def compute_rank_score(tier: str, rank: str, lp: int) -> int:
    base = TIER_ORDER.get(tier.upper(), -100000)
    if tier.upper() in ["CHALLENGER", "GRANDMASTER", "MASTER"]:
        return base + lp
    div_bonus = DIVISION_ORDER.get(rank.upper(), 0)
    return base + div_bonus + lp

async def fetch_account(client, game_name, tag_line):
    url = f"https://{ROUTING}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
    async with rate_sem:
        for _ in range(3):
            res = await client.get(url, headers=HEADERS)
            if res.status_code == 200:
                return res.json()
            elif res.status_code == 429:
                wait_sec = float(res.headers.get("Retry-After", 1.2))
                await asyncio.sleep(wait_sec + 0.1)
            else:
                break
    return None

async def fetch_summoner(client, puuid):
    url = f"https://{REGION}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}"
    async with rate_sem:
        for _ in range(3):
            res = await client.get(url, headers=HEADERS)
            if res.status_code == 200:
                return res.json()
            elif res.status_code == 429:
                wait_sec = float(res.headers.get("Retry-After", 1.2))
                await asyncio.sleep(wait_sec + 0.1)
            else:
                break
    return None

async def fetch_ranked_entries(client, puuid):
    url = f"https://{REGION}.api.riotgames.com/lol/league/v4/entries/by-puuid/{puuid}"
    async with rate_sem:
        for _ in range(3):
            res = await client.get(url, headers=HEADERS)
            if res.status_code == 200:
                return res.json()
            elif res.status_code == 429:
                wait_sec = float(res.headers.get("Retry-After", 1.2))
                await asyncio.sleep(wait_sec + 0.1)
            else:
                break
    return []

async def fetch_recent_ranked_ids(client, puuid, count=5):
    url = f"https://{ROUTING}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids?queue=420&count={count}"
    async with rate_sem:
        for _ in range(3):
            res = await client.get(url, headers=HEADERS)
            if res.status_code == 200:
                return res.json()
            elif res.status_code == 429:
                wait_sec = float(res.headers.get("Retry-After", 1.2))
                await asyncio.sleep(wait_sec + 0.1)
            else:
                break
    return []

async def fetch_match_raw(client, match_id):
    if match_id in match_raw_cache:
        return match_raw_cache[match_id]
    async with rate_sem:
        for attempt in range(4):
            try:
                url = f"https://{ROUTING}.api.riotgames.com/lol/match/v5/matches/{match_id}"
                res = await client.get(url, headers=HEADERS)
                if res.status_code == 200:
                    data = res.json()
                    match_raw_cache[match_id] = data
                    return data
                elif res.status_code == 429:
                    wait_sec = float(res.headers.get("Retry-After", 1.5))
                    await asyncio.sleep(wait_sec + 0.2)
                else:
                    break
            except Exception:
                await asyncio.sleep(0.5)
    return None

async def fetch_match_participant(client, match_id, puuid):
    data = await fetch_match_raw(client, match_id)
    if data and "info" in data:
        for p in data["info"]["participants"]:
            if p["puuid"] == puuid:
                return {
                    "win": p["win"],
                    "champion": p["championName"],
                    "kills": p["kills"],
                    "deaths": p["deaths"],
                    "assists": p["assists"],
                    "cs": p["totalMinionsKilled"] + p.get("neutralMinionsKilled", 0),
                    "game_duration": data["info"]["gameDuration"],
                }
    return None

@app.get("/api/leaderboard")
async def get_leaderboard():
    if "leaderboard" in cache:
        return cache["leaderboard"]

    players_file = Path(__file__).resolve().parent.parent / "players.txt"
    if not players_file.exists():
        raise HTTPException(status_code=404, detail="players.txt file not found")

    with open(players_file, "r", encoding="utf-8") as f:
        raw_lines = [line.strip() for line in f if line.strip() and not line.strip().startswith("#")]

    parsed_targets = []
    for line in raw_lines:
        if "|" in line:
            riot_id_raw, custom_name = line.split("|", 1)
        else:
            riot_id_raw, custom_name = line, ""
        
        if "#" in riot_id_raw:
            gname, tag = riot_id_raw.split("#", 1)
            parsed_targets.append({
                "game_name": gname.strip(),
                "tag_line": tag.strip(),
                "display_name": custom_name.strip() if custom_name.strip() else gname.strip()
            })

    results = []
    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. Fetch Accounts
        account_tasks = [fetch_account(client, t["game_name"], t["tag_line"]) for t in parsed_targets]
        accounts = await asyncio.gather(*account_tasks)

        # 2. Fetch Summoner, Ranked data, and Last 5 Match IDs
        sub_tasks = []
        valid_items = []
        for target, acc in zip(parsed_targets, accounts):
            if acc and "puuid" in acc:
                puuid = acc["puuid"]
                sub_tasks.append(asyncio.gather(
                    fetch_summoner(client, puuid),
                    fetch_ranked_entries(client, puuid),
                    fetch_recent_ranked_ids(client, puuid, count=5)
                ))
                valid_items.append((target, acc))

        combined_responses = await asyncio.gather(*sub_tasks)

        # 3. Collect unique match IDs and fetch in parallel
        all_match_ids_by_puuid = {}
        unique_match_ids = set()
        for (_, acc), (_, _, m_ids) in zip(valid_items, combined_responses):
            puuid = acc["puuid"]
            clean_ids = [m for m in m_ids if isinstance(m, str)]
            all_match_ids_by_puuid[puuid] = clean_ids
            unique_match_ids.update(clean_ids)

        match_tasks = [fetch_match_raw(client, mid) for mid in unique_match_ids]
        await asyncio.gather(*match_tasks)

        # 4. Load LP history snapshots
        lp_history = load_history()
        history_updated = False

        for (target, acc), (summoner, entries, _) in zip(valid_items, combined_responses):
            puuid = acc["puuid"]
            
            # Profile Icon & Level
            icon_id = summoner.get("profileIconId", 29) if summoner else 29
            icon_url = f"https://ddragon.leagueoflegends.com/cdn/{DDRAGON_VERSION}/img/profileicon/{icon_id}.png"
            level = summoner.get("summonerLevel", 0) if summoner else 0

            # Solo/Duo entry
            solo_entry = next((q for q in entries if q.get("queueType") == "RANKED_SOLO_5x5"), None) if entries else None

            if solo_entry:
                tier = solo_entry["tier"]
                rank = solo_entry["rank"]
                lp = solo_entry["leaguePoints"]
                wins = solo_entry["wins"]
                losses = solo_entry["losses"]
                total = wins + losses
                winrate = round((wins / total) * 100) if total > 0 else 0
            else:
                tier = "UNRANKED"
                rank = ""
                lp = 0
                wins = 0
                losses = 0
                total = 0
                winrate = 0

            tier_lower = tier.lower()
            emblem_url = f"/emblems/{tier_lower}.png"
            score = compute_rank_score(tier, rank, lp)

            # Analyze last 5 games
            recent_ids = all_match_ids_by_puuid.get(puuid, [])
            recent_games = []
            for mid in recent_ids:
                m_data = match_raw_cache.get(mid)
                if m_data and "info" in m_data:
                    part = next((p for p in m_data["info"]["participants"] if p["puuid"] == puuid), None)
                    if part:
                        recent_games.append({
                            "win": part["win"],
                            "champion": part["championName"],
                            "match_id": mid
                        })

            recent_wins = sum(1 for g in recent_games if g["win"])
            recent_losses = len(recent_games) - recent_wins

            # Calculate LP change for last 5 games
            player_records = lp_history.get(puuid, [])
            recent_lp_change = None

            if player_records and len(recent_ids) > 0:
                oldest_recent_mid = recent_ids[-1]
                past_snap = next((rec for rec in reversed(player_records) if rec.get("match_id") == oldest_recent_mid), None)
                if past_snap:
                    score_diff = score - past_snap.get("score", score)
                    recent_lp_change = score_diff

            if recent_lp_change is None:
                recent_lp_change = (recent_wins - recent_losses) * 20

            # Record snapshot
            latest_mid = recent_ids[0] if recent_ids else None
            now_ts = time.time()
            if not player_records or player_records[-1].get("match_id") != latest_mid or player_records[-1].get("lp") != lp:
                if puuid not in lp_history:
                    lp_history[puuid] = []
                lp_history[puuid].append({
                    "timestamp": now_ts,
                    "match_id": latest_mid,
                    "score": score,
                    "lp": lp,
                    "tier": tier,
                    "rank": rank
                })
                if len(lp_history[puuid]) > 50:
                    lp_history[puuid] = lp_history[puuid][-50:]
                history_updated = True

            results.append({
                "custom_name": target["display_name"],
                "riot_name": acc["gameName"],
                "riot_tag": acc["tagLine"],
                "puuid": puuid,
                "profile_icon": icon_url,
                "profile_icon_id": icon_id,
                "level": level,
                "tier": tier,
                "rank": rank,
                "lp": lp,
                "wins": wins,
                "losses": losses,
                "total_games": total,
                "winrate": winrate,
                "emblem_url": emblem_url,
                "rank_score": score,
                "recent_lp_change": recent_lp_change,
                "recent_games": recent_games,
                "recent_wins": recent_wins,
                "recent_losses": recent_losses
            })

        if history_updated:
            save_history(lp_history)

    results.sort(key=lambda x: x["rank_score"], reverse=True)
    cache["leaderboard"] = results
    return results

@app.get("/api/player/{puuid}")
async def get_player_details(puuid: str):
    if puuid in cache:
        return cache[puuid]

    async with httpx.AsyncClient(timeout=15.0) as client:
        url = f"https://{ROUTING}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids?queue=420&count=20"
        res = await client.get(url, headers=HEADERS)
        if res.status_code != 200:
            raise HTTPException(status_code=400, detail="Match ID query failed")

        match_ids = res.json()
        match_tasks = [fetch_match_participant(client, m_id, puuid) for m_id in match_ids]
        matches = await asyncio.gather(*match_tasks)
        valid = [m for m in matches if m]

        if not valid:
            return {"recent_winrate": 0, "total_recent": 0, "history": []}

        wins = sum(1 for m in valid if m["win"])
        recent_winrate = round((wins / len(valid)) * 100)

        # Attach champion avatar URL to the last 5 games
        for m in valid[:5]:
            m["champion_icon"] = f"https://ddragon.leagueoflegends.com/cdn/{DDRAGON_VERSION}/img/champion/{m['champion']}.png"

        payload = {
            "recent_winrate": recent_winrate,
            "total_recent": len(valid),
            "history": valid[:5]
        }
        cache[puuid] = payload
        return payload
