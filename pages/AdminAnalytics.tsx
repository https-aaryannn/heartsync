import React, { useEffect, useState } from 'react';
import { User, fetchStats } from '../services/firebase';
import { Card, Button } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { Users, Heart, Zap, Activity, AlertTriangle, ArrowLeft } from 'lucide-react';
import { auth } from '../services/firebase';

interface StatsData {
    totalUsers: number;
    totalCrushes: number;
    totalMatches: number;
    activePeriod: { id: string; name: string } | null;
    periodStats?: {
        [key: string]: {
            totalCrushes: number;
            totalMatches: number;
            topTargets: Array<{ username: string; count: number }>;
            submissionsPerDay: Array<{ date: string; count: number }>;
        }
    };
    activeActivity7d?: number;
}

export default function AdminAnalytics({ user }: { user: User }) {
    const navigate = useNavigate();
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // Basic Client-side Admin Guard
        if (!user) {
            navigate('/login');
            return;
        }
        const isAdmin = user.isAdmin || user.instagramUsername.includes('admin');
        if (!isAdmin) {
            navigate('/dashboard');
            return;
        }

        const loadStats = async () => {
            try {
                const token = await auth.currentUser?.getIdToken();
                const data = await fetchStats(token);
                setStats(data);
            } catch (err: any) {
                console.error(err);
                setError('Failed to load analytics: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, [user, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-400">
                <AlertTriangle className="mx-auto w-12 h-12 mb-4" />
                <p>{error}</p>
                <Button variant="outline" onClick={() => navigate('/dashboard')} className="mt-4">Go Back</Button>
            </div>
        );
    }

    if (!stats) return null;

    const activePeriodId = stats.activePeriod?.id;
    const periodData = activePeriodId && stats.periodStats ? stats.periodStats[activePeriodId] : null;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 pb-20">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" onClick={() => navigate('/dashboard')} className="!p-2">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Admin Analytics</h1>
                    <p className="text-gray-400">Overview of Heartsync performance</p>
                </div>
            </div>

            {/* Global Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card className="p-6 border-brand-primary/20 bg-brand-primary/5">
                    <div className="flex items-center gap-3 mb-2">
                        <Users className="w-5 h-5 text-brand-primary" />
                        <h3 className="font-medium text-gray-400">Total Users</h3>
                    </div>
                    <p className="text-3xl font-bold">{stats.totalUsers}</p>
                </Card>
                <Card className="p-6 border-brand-secondary/20 bg-brand-secondary/5">
                    <div className="flex items-center gap-3 mb-2">
                        <Heart className="w-5 h-5 text-brand-secondary" />
                        <h3 className="font-medium text-gray-400">Total Crushes</h3>
                    </div>
                    <p className="text-3xl font-bold">{stats.totalCrushes}</p>
                </Card>
                <Card className="p-6 border-brand-accent/20 bg-brand-accent/5">
                    <div className="flex items-center gap-3 mb-2">
                        <Zap className="w-5 h-5 text-brand-accent" />
                        <h3 className="font-medium text-gray-400">Total Matches</h3>
                    </div>
                    <p className="text-3xl font-bold">{stats.totalMatches}</p>
                </Card>
                <Card className="p-6 border-white/10 bg-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <Activity className="w-5 h-5 text-green-400" />
                        <h3 className="font-medium text-gray-400">7d Activity (Est)</h3>
                    </div>
                    <p className="text-3xl font-bold">{stats.activeActivity7d || '-'}</p>
                </Card>
            </div>

            {/* Charts Section */}
            {periodData && (
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Chart */}
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="p-6">
                            <h3 className="text-xl font-bold mb-6">Submissions Per Day ({stats.activePeriod?.name})</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={periodData.submissionsPerDay}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                            stroke="#666"
                                        />
                                        <YAxis stroke="#666" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#ec4899"
                                            strokeWidth={3}
                                            dot={{ fill: '#ec4899' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>

                    {/* Top Targets Table */}
                    <div className="lg:col-span-1">
                        <Card className="p-0 overflow-hidden h-full">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                <h3 className="text-xl font-bold">Top 10 Crushes</h3>
                                <div className="text-xs text-brand-secondary font-mono bg-brand-secondary/10 px-2 py-1 rounded">
                                    {stats.activePeriod?.name}
                                </div>
                            </div>
                            <div className="overflow-y-auto max-h-[400px]">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-white/5 text-xs uppercase text-gray-500 sticky top-0 backdrop-blur-md">
                                        <tr>
                                            <th className="p-4 font-medium">Rank</th>
                                            <th className="p-4 font-medium">Username</th>
                                            <th className="p-4 font-medium text-right">Count</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {periodData.topTargets.length > 0 ? (
                                            periodData.topTargets.map((target, idx) => (
                                                <tr key={target.username} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="p-4 text-gray-500 font-mono">#{idx + 1}</td>
                                                    <td className="p-4 font-bold text-white">@{target.username}</td>
                                                    <td className="p-4 text-right">
                                                        <span className="inline-block bg-brand-primary/20 text-brand-primary px-2 py-0.5 rounded text-sm font-bold">
                                                            {target.count}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="p-8 text-center text-gray-500">
                                                    No data yet.
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
        </div>
    );
}
