import { useEffect, useState } from 'react'
import { ExternalLink, X, Award } from 'lucide-react'

const TIER_THEMES = {
  CHALLENGER: {
    border: 'border-amber-400',
    text: 'text-amber-300',
    glowText: 'text-amber-300 drop-shadow-[0_0_18px_rgba(251,191,36,0.65)]',
    bg: 'from-amber-950/60 via-amber-900/20 to-zinc-950',
    pill: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black',
    glow: 'shadow-[0_0_20px_rgba(251,191,36,0.25)]',
    accentColor: '#fbbf24'
  },
  GRANDMASTER: {
    border: 'border-rose-500',
    text: 'text-rose-400',
    glowText: 'text-rose-400 drop-shadow-[0_0_18px_rgba(244,63,94,0.65)]',
    bg: 'from-rose-950/60 via-rose-900/20 to-zinc-950',
    pill: 'bg-gradient-to-r from-rose-500 to-red-600 text-white font-black',
    glow: 'shadow-[0_0_20px_rgba(244,63,94,0.25)]',
    accentColor: '#f43f5e'
  },
  MASTER: {
    border: 'border-purple-500',
    text: 'text-purple-300',
    glowText: 'text-purple-300 drop-shadow-[0_0_18px_rgba(168,85,247,0.65)]',
    bg: 'from-purple-950/60 via-purple-900/20 to-zinc-950',
    pill: 'bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white font-black',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.25)]',
    accentColor: '#a855f7'
  },
  DIAMOND: {
    border: 'border-cyan-400',
    text: 'text-cyan-300',
    glowText: 'text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,0.65)]',
    bg: 'from-cyan-950/60 via-cyan-900/20 to-zinc-950',
    pill: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-black',
    glow: 'shadow-[0_0_20px_rgba(34,211,238,0.25)]',
    accentColor: '#22d3ee'
  },
  EMERALD: {
    border: 'border-emerald-400',
    text: 'text-emerald-400',
    glowText: 'text-emerald-300 drop-shadow-[0_0_18px_rgba(52,211,153,0.65)]',
    bg: 'from-emerald-950/60 via-emerald-900/20 to-zinc-950',
    pill: 'bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-black',
    glow: 'shadow-[0_0_20px_rgba(52,211,153,0.25)]',
    accentColor: '#34d399'
  },
  PLATINUM: {
    border: 'border-teal-400',
    text: 'text-teal-300',
    glowText: 'text-teal-300 drop-shadow-[0_0_18px_rgba(45,212,191,0.65)]',
    bg: 'from-teal-950/60 via-teal-900/20 to-zinc-950',
    pill: 'bg-gradient-to-r from-teal-400 to-cyan-500 text-black font-bold',
    glow: 'shadow-[0_0_18px_rgba(45,212,191,0.2)]',
    accentColor: '#2dd4bf'
  },
  GOLD: {
    border: 'border-amber-400',
    text: 'text-amber-400',
    glowText: 'text-amber-300 drop-shadow-[0_0_18px_rgba(251,191,36,0.65)]',
    bg: 'from-amber-950/60 via-amber-900/20 to-zinc-950',
    pill: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold',
    glow: 'shadow-[0_0_18px_rgba(251,191,36,0.2)]',
    accentColor: '#fbbf24'
  },
  SILVER: {
    border: 'border-slate-300',
    text: 'text-slate-200',
    glowText: 'text-slate-100 drop-shadow-[0_0_14px_rgba(226,232,240,0.55)]',
    bg: 'from-slate-850/60 via-slate-800/20 to-zinc-950',
    pill: 'bg-gradient-to-r from-slate-200 to-slate-400 text-black font-bold',
    glow: 'shadow-[0_0_15px_rgba(203,213,225,0.18)]',
    accentColor: '#cbd5e1'
  },
  BRONZE: {
    border: 'border-amber-700',
    text: 'text-amber-500',
    glowText: 'text-amber-400 drop-shadow-[0_0_14px_rgba(217,119,6,0.55)]',
    bg: 'from-amber-950/50 via-amber-900/20 to-zinc-950',
    pill: 'bg-gradient-to-r from-amber-700 to-amber-800 text-white font-bold',
    glow: '',
    accentColor: '#d97706'
  },
  IRON: {
    border: 'border-stone-500',
    text: 'text-stone-300',
    glowText: 'text-stone-200 drop-shadow-[0_0_10px_rgba(168,162,158,0.4)]',
    bg: 'from-stone-900/60 to-zinc-950',
    pill: 'bg-stone-700 text-stone-200 font-bold',
    glow: '',
    accentColor: '#a8a29e'
  },
  UNRANKED: {
    border: 'border-zinc-700',
    text: 'text-zinc-400',
    glowText: 'text-zinc-300',
    bg: 'from-zinc-900/60 to-zinc-950',
    pill: 'bg-zinc-800 text-zinc-400 font-bold',
    glow: '',
    accentColor: '#71717a'
  }
}

const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:8000'
  : (import.meta.env.VITE_API_URL || 'https://leagueleaderboard.onrender.com')

function App() {
  const [leaderboard, setLeaderboard] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [playerStats, setPlayerStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/leaderboard`)
      .then(res => res.json())
      .then(data => {
        setLeaderboard(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const openPlayerDrawer = async (player) => {
    setSelectedPlayer(player)
    setPlayerStats(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/player/${player.puuid}`)
      const data = await res.json()
      setPlayerStats(data)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0c10] text-[#e1e7ec] font-sans antialiased p-4 md:p-8 selection:bg-rose-600 selection:text-white">
      {/* Background Graphic Grid */}
      <div className="fixed inset-0 bg-[radial-gradient(#1a202c_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none"></div>

      <div className="relative max-w-5xl mx-auto">
        {/* Header Section */}
        <header className="mb-8 border-b-2 border-zinc-800 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 bg-rose-500 animate-pulse inline-block shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
            <p className="text-xs uppercase tracking-[0.25em] font-mono text-rose-500 font-bold">
              Crifzer&apos;s
            </p>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase italic flex flex-wrap items-center gap-x-3">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-300 via-emerald-400 to-teal-300 drop-shadow-[0_0_24px_rgba(74,222,128,0.5)] font-black tracking-wider">
              STINKIER
            </span>
            <span className="text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              LEAGUE LEADERBOARD
            </span>
          </h1>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent animate-spin"></div>
            <p className="font-mono text-sm tracking-widest text-zinc-400">CALCULATING MATCH DATA...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Desktop Column Header Labels for Perfect Tabular Alignment */}
            <div className="hidden md:grid md:grid-cols-[1fr_210px_160px_150px] gap-4 px-4 pb-1 text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-bold border-b border-zinc-800/80">
              <span>Summoner</span>
              <span>Rank</span>
              <span className="text-center">Form (Last 5)</span>
              <span className="text-right">Season Record</span>
            </div>

            {leaderboard.map((player, idx) => {
              const theme = TIER_THEMES[player.tier] || TIER_THEMES.UNRANKED
              const rankNumber = String(idx + 1).padStart(2, '0')
              const emblemSrc = player.emblem_url || `/emblems/${(player.tier || 'unranked').toLowerCase()}.png`
              const totalGames = player.total_games ?? (player.wins + player.losses)

              return (
                <div
                  key={player.puuid}
                  onClick={() => openPlayerDrawer(player)}
                  className={`group relative flex flex-col md:grid md:grid-cols-[1fr_210px_160px_150px] md:items-center gap-4 p-4 bg-[#11141a] hover:bg-[#151922] border-2 ${theme.border} transition-all duration-150 cursor-pointer ${theme.glow}`}
                >
                  {/* Column 1: Standing Number, Avatar with Rank Border, and Names */}
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="font-mono text-xl md:text-2xl font-black text-zinc-600 group-hover:text-white transition-colors w-8 flex-shrink-0">
                      {rankNumber}
                    </span>

                    {/* Profile Picture with Visible Tier Rank Border */}
                    <div className="relative flex-shrink-0">
                      <img 
                        src={player.profile_icon} 
                        alt={player.custom_name}
                        className={`w-14 h-14 md:w-16 md:h-16 rounded-sm border-2 md:border-[3px] ${theme.border} ${theme.glow} group-hover:brightness-110 transition-all object-cover`}
                        onError={(e) => { 
                          e.target.src = 'https://ddragon.leagueoflegends.com/cdn/16.21.1/img/profileicon/29.png' 
                        }}
                      />
                      <span className="absolute -bottom-2 -right-2 text-[10px] font-mono bg-black/90 border border-zinc-700 px-1.5 py-0.2 text-zinc-300 font-bold shadow">
                        {player.level}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black tracking-tight text-white group-hover:text-rose-400 transition-colors uppercase truncate">
                          {player.custom_name}
                        </h2>
                        {idx === 0 && <Award className="w-5 h-5 text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] flex-shrink-0" />}
                      </div>
                      <p className="text-xs font-mono text-zinc-400 tracking-wider truncate">
                        {player.riot_name}
                        <span className="text-zinc-600 font-bold">#{player.riot_tag}</span>
                      </p>
                    </div>
                  </div>

                  {/* Column 2: Rank (Fixed width column so Gold and Platinum align identically) */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0 w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
                      <img 
                        src={emblemSrc} 
                        alt={player.tier}
                        className="max-w-full max-h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)] transition-transform group-hover:scale-105"
                        onError={(e) => { 
                          e.target.src = `/emblems/${(player.tier || 'unranked').toLowerCase()}.png`
                        }}
                      />
                    </div>
                    <div className="text-left min-w-0">
                      <div className={`text-sm md:text-base font-black tracking-wider uppercase ${theme.text} whitespace-nowrap`}>
                        {player.tier} {player.rank}
                      </div>
                      <div className="text-xs font-mono font-bold text-zinc-300">
                        {player.lp} <span className="text-zinc-500 font-normal">LP</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Recent 5 Games Form (WWLLW) */}
                  <div className="flex flex-col items-center justify-center bg-black/40 border border-zinc-800/80 px-3 py-1.5 rounded-sm">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono font-bold mb-1.5 whitespace-nowrap">
                      Last 5 Games
                    </span>

                    {/* Mini Match Badges (Chronological: Left = Oldest -> Right = Most Recent) */}
                    <div className="flex items-center gap-1">
                      {player.recent_games && player.recent_games.length > 0 ? (
                        [...player.recent_games].reverse().map((g, i, arr) => {
                          const isLatest = i === arr.length - 1
                          return (
                            <span
                              key={i}
                              title={`${g.champion}: ${g.win ? 'Victory' : 'Defeat'}${isLatest ? ' (Latest)' : ''}`}
                              className={`w-5 h-5 rounded-xs flex items-center justify-center text-[10px] font-mono font-black transition-transform hover:scale-110 ${
                                g.win 
                                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-[0_0_6px_rgba(52,211,153,0.2)]' 
                                  : 'bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-[0_0_6px_rgba(244,63,94,0.2)]'
                              } ${isLatest ? 'ring-1 ring-white/30' : ''}`}
                            >
                              {g.win ? 'W' : 'L'}
                            </span>
                          )
                        })
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-500">NO GAMES</span>
                      )}
                    </div>
                  </div>

                  {/* Column 4: Total Games & Winrate Stats */}
                  <div className="text-right">
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-emerald-400 font-bold">{player.wins}W</span>
                      <span className="text-zinc-600 font-normal">|</span>
                      <span className="text-rose-400 font-bold">{player.losses}L</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-2 flex overflow-hidden border border-zinc-700">
                      <div 
                        className="bg-emerald-500 h-full" 
                        style={{ width: `${player.winrate}%` }}
                      ></div>
                      <div 
                        className="bg-rose-500 h-full" 
                        style={{ width: `${100 - player.winrate}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 mt-1">
                      <span className="font-bold text-zinc-300">{player.winrate}% WR</span>
                      <span className="text-zinc-400 font-semibold">
                        <strong className="text-white">{totalGames}</strong> <span className="text-[10px] text-zinc-500 font-normal">GAMES</span>
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Profile Drawer / Modal */}
      {selectedPlayer && (() => {
        const modalTheme = TIER_THEMES[selectedPlayer.tier] || TIER_THEMES.UNRANKED
        const modalEmblem = selectedPlayer.emblem_url || `/emblems/${(selectedPlayer.tier || 'unranked').toLowerCase()}.png`
        const modalTotalGames = selectedPlayer.total_games ?? (selectedPlayer.wins + selectedPlayer.losses)

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#11141a] border-2 border-zinc-700 w-full max-w-lg p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 transition-colors rounded-xs"
              >
                <X size={20} />
              </button>

              {/* Dossier Header */}
              <div className="flex items-center gap-4 mb-6 border-b-2 border-zinc-800 pb-4">
                <img 
                  src={selectedPlayer.profile_icon} 
                  alt="" 
                  className={`w-16 h-16 border-2 ${modalTheme.border} ${modalTheme.glow} object-cover`} 
                  onError={(e) => { 
                    e.target.src = 'https://ddragon.leagueoflegends.com/cdn/16.21.1/img/profileicon/29.png' 
                  }}
                />
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-rose-500 font-bold">Summoner Profile</span>
                  <h3 className="text-2xl font-black uppercase text-white tracking-tight">{selectedPlayer.custom_name}</h3>
                  <p className="text-xs font-mono text-zinc-400">{selectedPlayer.riot_name}#{selectedPlayer.riot_tag}</p>
                </div>
              </div>

              {/* Colorful Rank Showcase Card */}
              <div className={`mb-6 p-4 rounded-sm border-2 ${modalTheme.border} bg-gradient-to-br ${modalTheme.bg} ${modalTheme.glow} transition-all`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Glowing Rank Crest */}
                    <div className="relative flex-shrink-0 w-20 h-20 flex items-center justify-center">
                      <div 
                        className="absolute inset-0 rounded-full blur-xl opacity-40 -z-10"
                        style={{ backgroundColor: modalTheme.accentColor }}
                      ></div>
                      <img 
                        src={modalEmblem} 
                        alt={selectedPlayer.tier}
                        className="max-w-full max-h-full object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]"
                        onError={(e) => { 
                          e.target.src = `/emblems/${(selectedPlayer.tier || 'unranked').toLowerCase()}.png`
                        }}
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block font-semibold mb-0.5">
                        Current Rank
                      </span>
                      <h4 className={`text-2xl md:text-3xl font-black uppercase tracking-tight ${modalTheme.glowText}`}>
                        {selectedPlayer.tier} {selectedPlayer.rank}
                      </h4>
                      <div className="mt-1.5 font-mono">
                        <span className="text-sm font-black text-white bg-black/60 px-2.5 py-0.5 border border-white/10 rounded-sm">
                          {selectedPlayer.lp} <span className="text-zinc-400 font-normal text-xs">LP</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Season Record */}
                  <div className="text-right font-mono border-l border-white/10 pl-4 flex-shrink-0">
                    <span className="text-[10px] uppercase text-zinc-400 block font-semibold mb-1">Season Record</span>
                    <div className="text-base md:text-lg font-black text-emerald-400">
                      {selectedPlayer.wins}W <span className="text-rose-400">{selectedPlayer.losses}L</span>
                    </div>
                    <span className="text-xs text-zinc-300 font-semibold block mt-0.5">
                      {selectedPlayer.winrate}% ({modalTotalGames} Games)
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Form (Last 20 & Last 5) */}
              {playerStats ? (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs uppercase font-mono tracking-wider font-bold text-zinc-300">Last 5 Match History</span>
                    <span className="text-xs font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 border border-zinc-700">
                      20G WR: <strong className="text-white">{playerStats.recent_winrate}%</strong>
                    </span>
                  </div>

                  <div className="space-y-2">
                    {playerStats.history.map((m, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-center justify-between p-2.5 border-l-4 font-mono text-xs ${
                          m.win 
                            ? 'border-emerald-500 bg-emerald-950/20 text-emerald-200' 
                            : 'border-rose-500 bg-rose-950/20 text-rose-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={m.champion_icon} 
                            alt={m.champion} 
                            className="w-8 h-8 rounded-none border border-zinc-700 object-cover"
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                          <div>
                            <div className="font-bold uppercase tracking-tight">{m.champion}</div>
                            <div className="text-[10px] opacity-75">{m.win ? 'VICTORY' : 'DEFEAT'}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-white">{m.kills} / {m.deaths} / {m.assists}</div>
                          <div className="text-[10px] text-zinc-400">{m.cs} CS</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center font-mono text-xs text-zinc-500 border border-zinc-800 mb-6 animate-pulse">
                  RETRIEVING COMBAT TELEMETRY...
                </div>
              )}

              {/* OP.GG External Link */}
              <a 
                href={`https://www.op.gg/summoners/na/${encodeURIComponent(selectedPlayer.riot_name)}-${encodeURIComponent(selectedPlayer.riot_tag)}`}
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-200 hover:bg-white text-black font-black uppercase text-sm tracking-wider transition-colors"
              >
                Full Analytics on OP.GG
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default App
