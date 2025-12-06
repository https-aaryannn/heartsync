import React, { useEffect, useState } from 'react';
import { Period, PeriodStats } from '../types';
import { Card, Button, Input } from '../components/UI';
import { getAdminStats, createPeriod } from '../services/firebase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Admin({ activePeriod }: { activePeriod: Period | null }) {
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [newPeriodName, setNewPeriodName] = useState('');

  useEffect(() => {
    if (activePeriod) {
      getAdminStats(activePeriod.id).then(setStats);
    }
  }, [activePeriod]);

  const handleStartPeriod = async () => {
    if (!newPeriodName) return;
    // Create period logic (mocked)
    alert(`Starting period: ${newPeriodName}`);
    // In real app: await createPeriod(...)
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Admin Control</h1>
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${activePeriod ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-400">{activePeriod ? 'System Active' : 'System Offline'}</span>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card>
            <p className="text-gray-400 text-sm">Total Crushes</p>
            <p className="text-3xl font-bold text-brand-primary">{stats.totalCrushes}</p>
          </Card>
          <Card>
            <p className="text-gray-400 text-sm">Mutual Matches</p>
            <p className="text-3xl font-bold text-brand-secondary">{stats.totalMatches}</p>
          </Card>
          <Card>
            <p className="text-gray-400 text-sm">Conversion Rate</p>
            <p className="text-3xl font-bold text-brand-accent">
              {((stats.totalMatches * 2 / stats.totalCrushes) * 100).toFixed(1)}%
            </p>
          </Card>
          <Card>
            <p className="text-gray-400 text-sm">Active Users</p>
            <p className="text-3xl font-bold text-white">842</p>
          </Card>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Chart */}
        <Card className="min-h-[400px]">
          <h3 className="text-xl font-bold mb-6">Submission Activity</h3>
          {stats && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.dailySubmissions}>
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1025', borderColor: '#374151' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" fill="#9333ea" radius={[4, 4, 0, 0]}>
                  {stats.dailySubmissions.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#9333ea' : '#db2777'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Management */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-xl font-bold mb-4">Period Management</h3>
            {activePeriod ? (
              <div>
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
                  <p className="text-green-400 font-bold">Active: {activePeriod.name}</p>
                  <p className="text-xs text-gray-400 mt-1">Started: {new Date(activePeriod.startAt).toLocaleDateString()}</p>
                </div>
                <Button variant="danger" fullWidth onClick={() => alert('Ending period...')}>
                  End Current Season
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Input 
                  label="New Period Name"
                  value={newPeriodName}
                  onChange={(e) => setNewPeriodName(e.target.value)}
                  placeholder="e.g., Spring Fling 2024"
                />
                <Button variant="primary" fullWidth onClick={handleStartPeriod}>
                  Start New Season
                </Button>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-xl font-bold mb-4">Top Trending Names</h3>
            <div className="space-y-3">
              {stats?.topNames.map((item, i) => (
                <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-gray-300">#{i + 1} {item.name}</span>
                  <span className="font-bold text-brand-secondary">{item.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}