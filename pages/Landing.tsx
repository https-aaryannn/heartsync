import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Period } from '../types';
import { Button, Card, Input } from '../components/UI';
import { Heart, Search, Lock, Zap, Users, Activity as ActivityIcon, Star as StarIcon } from 'lucide-react';
import { getWhoLikesMeCount, fetchStats } from '../services/firebase';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function Landing({ activePeriod }: { activePeriod: Period | null }) {
  const [searchName, setSearchName] = useState('');
  const [searchResult, setSearchResult] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [stats, setStats] = useState<any>(null);

  React.useEffect(() => {
    fetchStats().then(setStats).catch(err => console.log('Stats load failed', err));
  }, []);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchName || !activePeriod) return;
    setSearching(true);
    try {
      const count = await getWhoLikesMeCount(searchName, activePeriod.id);
      setSearchResult(count);
    } catch (error) {
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-primary/20 rounded-full blur-[128px] -z-10" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-secondary/20 rounded-full blur-[128px] -z-10" />

      <div className="max-w-5xl mx-auto px-4 pt-20 pb-32">
        <div className="text-center mb-16">
          <span className="inline-block py-1 px-3 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-sm font-medium mb-6">
            {activePeriod ? `Active: ${activePeriod.name} ` : 'Waiting for next season...'}
          </span>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Who's secretly <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-primary">
              syncing with you?
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Heartsync is the modern way to confess. Submit your crush anonymously.
            If they crush on you back, it's a match.
          </p>

          {stats && (
            <div className="flex flex-wrap justify-center gap-4 mb-10 animate-fade-in-up">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 text-sm text-gray-300">
                <Users className="w-4 h-4 text-brand-primary" />
                <span className="font-bold text-white">{stats.totalUsers || 0}</span> Users
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 text-sm text-gray-300">
                <Heart className="w-4 h-4 text-brand-secondary" />
                <span className="font-bold text-white">{stats.totalCrushes || 0}</span> Crushes
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 text-sm text-gray-300">
                <Zap className="w-4 h-4 text-brand-accent" />
                <span className="font-bold text-white">{stats.totalMatches || 0}</span> Matches
              </div>
            </div>
          )}

          {/* Public Charts Section */}
          {stats && stats.periodStats && activePeriod && stats.periodStats[activePeriod.id] && (
            <div className="mb-20 animate-fade-in-up delay-100">
              <div className="grid lg:grid-cols-3 gap-8 text-left">
                {/* Chart */}
                <Card className="lg:col-span-2 p-6 border-white/5 bg-white/5 backdrop-blur-sm">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <ActivityIcon className="w-5 h-5 text-brand-primary" />
                    Daily Vibe Check
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.periodStats[activePeriod.id].submissionsPerDay}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(val: string) => val.split('-').slice(1).join('/')}
                          stroke="#666"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis stroke="#666" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                          itemStyle={{ color: '#fff' }}
                          labelStyle={{ color: '#999', marginBottom: '4px' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#ec4899"
                          strokeWidth={3}
                          dot={{ fill: '#ec4899', strokeWidth: 0, r: 4 }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Top 10 */}
                <Card className="lg:col-span-1 p-0 overflow-hidden border-white/5 bg-white/5 backdrop-blur-sm h-full">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <StarIcon className="w-5 h-5 text-brand-secondary" />
                      Trending
                    </h3>
                  </div>
                  <div className="overflow-y-auto max-h-[340px]">
                    <table className="w-full text-left border-collapse">
                      <tbody className="divide-y divide-white/5">
                        {stats.periodStats[activePeriod.id].topTargets.length > 0 ? (
                          stats.periodStats[activePeriod.id].topTargets.map((target: any, idx: number) => (
                            <tr key={target.username} className="hover:bg-white/5 transition-colors">
                              <td className="p-4 text-gray-500 font-mono text-sm w-12">#{idx + 1}</td>
                              <td className="p-4 font-bold text-white">@{target.username}</td>
                              <td className="p-4 text-right">
                                <span className="inline-block bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded text-xs font-bold">
                                  {target.count}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="p-8 text-center text-gray-500">
                              No crushes yet this season. Be the first!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/submit">
              <Button variant="primary">Submit a Crush</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline">My Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          <Card className="text-center hover:border-brand-primary/50 transition-colors">
            <div className="bg-brand-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-brand-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">100% Anonymous</h3>
            <p className="text-gray-400 text-sm">
              Your identity is hidden. They only see the number of crushes, never your name, unless matched.
            </p>
          </Card>
          <Card className="text-center hover:border-brand-secondary/50 transition-colors">
            <div className="bg-brand-secondary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-brand-secondary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Mutual Reveal</h3>
            <p className="text-gray-400 text-sm">
              The magic happens when feelings are mutual. If you both sync, names are revealed instantly.
            </p>
          </Card>
          <Card className="text-center hover:border-brand-accent/50 transition-colors">
            <div className="bg-brand-accent/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-6 h-6 text-brand-accent" />
            </div>
            <h3 className="text-lg font-bold mb-2">Period Based</h3>
            <p className="text-gray-400 text-sm">
              Crushes are reset every season (e.g., Valentine Week). Take your shot before time runs out.
            </p>
          </Card>
        </div>

        {/* Public Check */}
        {activePeriod && (
          <div className="max-w-xl mx-auto">
            <Card className="relative overflow-hidden border-brand-primary/30">
              <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 to-transparent pointer-events-none" />
              <h2 className="text-2xl font-bold text-center mb-6">Check the vibe</h2>
              <form onSubmit={handleCheck}>
                <div className="relative">
                  <Input
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Enter Name or Instagram ID (@username)..."
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1.5 bg-brand-surface border border-white/10 p-2 rounded-md hover:bg-white/5 text-gray-300"
                  >
                    {searching ? <div className="animate-spin w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
              </form>

              {searchResult !== null && (
                <div className="mt-6 text-center animate-fade-in">
                  <p className="text-gray-400">Current crushes on <span className="text-white font-bold">{searchName}</span>:</p>
                  <div className="text-5xl font-bold text-brand-secondary mt-2">{searchResult}</div>
                  <p className="text-xs text-gray-500 mt-2">Join to see if one of them is for you.</p>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}