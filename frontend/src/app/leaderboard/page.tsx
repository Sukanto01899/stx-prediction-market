"use client";

import { Trophy, Medal, Award } from "lucide-react";

export default function LeaderboardPage() {
  // Mock data - in production, fetch from contract/indexer
  const leaderboard = [
    { rank: 1, address: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7", winnings: 15420, bets: 89, winRate: 72 },
    { rank: 2, address: "SP1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE", winnings: 12350, bets: 156, winRate: 65 },
    { rank: 3, address: "SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE", winnings: 9870, bets: 45, winRate: 78 },
    { rank: 4, address: "SP31G2FZ5JN87BATZMP4ZRYE5F7WZQDNEXJ7G7X97", winnings: 8540, bets: 67, winRate: 61 },
    { rank: 5, address: "SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR", winnings: 7200, bets: 112, winRate: 58 },
    { rank: 6, address: "SP3GWX3NE58KXHESRYE4DYQ1S31PQJTCRXB3PE9SB", winnings: 5680, bets: 34, winRate: 82 },
    { rank: 7, address: "SP1Y5YSTAHZ88XYK1VPDH24GY0HPX5J4JECTMY4A1", winnings: 4920, bets: 78, winRate: 54 },
    { rank: 8, address: "SP2KAF9RF86PVX3NEE27DFV1CQX0T4WGR41X3S45C", winnings: 3450, bets: 23, winRate: 70 },
    { rank: 9, address: "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9", winnings: 2890, bets: 91, winRate: 49 },
    { rank: 10, address: "SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR", winnings: 2340, bets: 56, winRate: 52 },
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-600" />;
      default:
        return <span className="w-6 text-center font-bold text-gray-500">{rank}</span>;
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="relative overflow-hidden">
      <div className="absolute -top-32 right-0 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />

      <div className="relative max-w-6xl mx-auto font-display text-slate-100">
        <header className="mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
            Leaderboard
          </span>
          <h1 className="font-serif-display text-4xl md:text-5xl font-semibold mt-4">
            Top market forecasters
          </h1>
          <p className="text-slate-300 mt-3 max-w-2xl">
            Rankings update as markets resolve. Earned STX and win rates are tracked on-chain.
          </p>
        </header>

        {/* Podium */}
        <div className="grid gap-6 md:grid-cols-3 mb-10">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)] backdrop-blur md:order-1">
            <Medal className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Second</p>
            <p className="text-xl font-semibold mt-2">{formatAddress(leaderboard[1].address)}</p>
            <p className="text-2xl font-bold text-emerald-300 mt-3">{leaderboard[1].winnings.toLocaleString()} STX</p>
            <p className="text-xs text-slate-400">{leaderboard[1].winRate}% win rate</p>
          </div>

          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-slate-900/70 p-7 text-center shadow-[0_20px_70px_-40px_rgba(251,191,36,0.4)] backdrop-blur md:order-2">
            <Trophy className="w-16 h-16 text-amber-300 mx-auto mb-3" />
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Champion</p>
            <p className="text-2xl font-semibold mt-2">{formatAddress(leaderboard[0].address)}</p>
            <p className="text-3xl font-bold text-emerald-300 mt-3">{leaderboard[0].winnings.toLocaleString()} STX</p>
            <p className="text-xs text-amber-100/80">{leaderboard[0].winRate}% win rate</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)] backdrop-blur md:order-3">
            <Award className="w-12 h-12 text-orange-300 mx-auto mb-3" />
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Third</p>
            <p className="text-xl font-semibold mt-2">{formatAddress(leaderboard[2].address)}</p>
            <p className="text-2xl font-bold text-emerald-300 mt-3">{leaderboard[2].winnings.toLocaleString()} STX</p>
            <p className="text-xs text-slate-400">{leaderboard[2].winRate}% win rate</p>
          </div>
        </div>

        {/* Full Leaderboard */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)] backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <h2 className="text-xl font-semibold">Top Predictors</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Testnet</span>
          </div>
          <div className="divide-y divide-slate-800">
            {leaderboard.map((user) => (
              <div
                key={user.rank}
                className="grid grid-cols-[80px_1fr_120px_80px_100px] items-center gap-3 px-6 py-4 text-sm text-slate-300 transition hover:bg-slate-950/40"
              >
                <div className="flex items-center gap-2">
                  {getRankIcon(user.rank)}
                  <span className="text-xs text-slate-500">#{user.rank}</span>
                </div>
                <div className="font-mono text-xs sm:text-sm text-slate-200">{formatAddress(user.address)}</div>
                <div className="text-right font-semibold text-emerald-300">{user.winnings.toLocaleString()} STX</div>
                <div className="text-right text-slate-400">{user.bets}</div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${
                      user.winRate >= 70
                        ? "bg-emerald-500/15 text-emerald-300"
                        : user.winRate >= 50
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    {user.winRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
