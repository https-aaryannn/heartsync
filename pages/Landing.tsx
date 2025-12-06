import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Period } from '../types';
import { Button, Card, Input } from '../components/UI';
import { Heart, Search, Lock, Zap } from 'lucide-react';
import { getWhoLikesMeCount } from '../services/firebase';

export default function Landing({ activePeriod }: { activePeriod: Period | null }) {
  const [searchName, setSearchName] = useState('');
  const [searchResult, setSearchResult] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);

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
            {activePeriod ? `Active: ${activePeriod.name}` : 'Waiting for next season...'}
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
                    {searching ? <div className="animate-spin w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full"/> : <Search className="w-5 h-5" />}
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