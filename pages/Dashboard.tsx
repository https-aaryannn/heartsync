import React, { useEffect, useState } from 'react';
import { User, getWhoLikesMeCount, subscribeToMyMatches } from '../services/firebase';
import { Period, Match } from '../types';
import { Card, Button } from '../components/UI';
import { Heart, Users, Eye, ArrowRight, Instagram, MessageCircle, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import MyCrushesTab from '../components/MyCrushesTab';

export default function Dashboard({ user, activePeriod }: { user: User, activePeriod: Period | null }) {
  const [activeTab, setActiveTab] = useState<'crushes' | 'matches' | 'likes'>('crushes');
  const [matches, setMatches] = useState<Match[]>([]);
  const [likesCount, setLikesCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Real-time Data Subscription
  useEffect(() => {
    if (!user || !user.instagramUsername || !activePeriod) return;

    setLoading(true);

    const unsubscribeMatches = subscribeToMyMatches(
      user.instagramUsername,
      activePeriod.id,
      (matches) => {
        setMatches(matches);
        setLoading(false); // First load done
      },
      (error) => {
        console.error("Error subscribing to matches:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeMatches();
    };
  }, [user]);

  // Auto-fetch likes count
  useEffect(() => {
    const fetchLikes = async () => {
      if (activePeriod && user.instagramUsername) {
        const count = await getWhoLikesMeCount(user.instagramUsername, activePeriod.id);
        setLikesCount(count);
      }
    };
    fetchLikes();
  }, [activePeriod, user]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Hello, {user.displayName?.split(' ')[0]}</h1>
          <p className="text-gray-400">
            {activePeriod ? `Season: ${activePeriod.name}` : 'No active season'}
          </p>
        </div>
        {activePeriod && (
          <Link to="/submit" className="mt-4 md:mt-0">
            <Button variant="primary">
              <Heart className="w-4 h-4 mr-2 fill-current" />
              New Crush
            </Button>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-white/10 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('crushes')}
          className={`pb-3 px-1 font-medium transition-colors ${activeTab === 'crushes' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-gray-400 hover:text-white'}`}
        >
          My Crushes
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`pb-3 px-1 font-medium transition-colors ${activeTab === 'matches' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-gray-400 hover:text-white'}`}
        >
          Matches <span className="ml-1 bg-brand-secondary text-white text-xs rounded-full px-2 py-0.5">{matches.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('likes')}
          className={`pb-3 px-1 font-medium transition-colors ${activeTab === 'likes' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-gray-400 hover:text-white'}`}
        >
          Who Likes Me
          {likesCount !== null && likesCount > 0 && (
            <span className="ml-2 bg-brand-accent text-brand-dark text-xs rounded-full px-2 py-0.5 font-bold">
              {likesCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[300px]">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"></div>
          </div>
        ) : (
          <>
            {activeTab === 'crushes' && (
              <MyCrushesTab user={user} activePeriod={activePeriod} />
            )}

            {activeTab === 'matches' && (
              <div className="space-y-4">
                {matches.length === 0 ? (
                  <div className="text-center py-12">
                    <h3 className="text-gray-400">No matches yet. Keep the faith!</h3>
                  </div>
                ) : (
                  matches.map(match => {
                    const isUserA = match.userAInstagram === user.instagramUsername?.replace(/^@/, '').toLowerCase();
                    const partnerName = isUserA ? match.userBName : match.userAName;
                    const partnerHandle = isUserA ? match.userBInstagram : match.userAInstagram;

                    return (
                      <Card key={match.id} className="bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 border-brand-primary/30">
                        <div className="flex flex-col items-center text-center">
                          <div className="flex items-center justify-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                              <span className="text-2xl">You</span>
                            </div>
                            <Heart className="w-8 h-8 text-red-500 fill-red-500 animate-pulse" />
                            <div className="w-16 h-16 rounded-full bg-brand-secondary flex items-center justify-center overflow-hidden">
                              <span className="text-xl font-bold">{partnerName.charAt(0)}</span>
                            </div>
                          </div>
                          <h3 className="text-2xl font-bold text-white mb-2">
                            It's a Match!
                          </h3>
                          <p className="text-gray-300 mb-6">
                            You and <span className="text-brand-secondary font-bold">{partnerName}</span> like each other.
                          </p>

                          <a
                            href={`https://instagram.com/${partnerHandle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full md:w-auto mb-8"
                          >
                            <Button variant="primary" className="w-full md:w-auto">
                              <Instagram className="w-4 h-4 mr-2" />
                              Open @{partnerHandle} on Instagram
                            </Button>
                          </a>

                          <div className="w-full text-left bg-black/20 rounded-xl p-4 md:p-6 border border-white/5">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <MessageCircle className="w-4 h-4" />
                              Need help starting the conversation?
                            </h4>
                            <div className="space-y-2">
                              {[
                                "Hey, looks like we matched on Heartsync 👀 had to come say hi!",
                                "Hi! Sooo… Heartsync thinks we’d vibe 😅 what do you think?",
                                "Hey, I didn’t expect us to match there 😂 how’s your day going?"
                              ].map((msg, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    navigator.clipboard.writeText(msg);
                                    // Optional: visual feedback
                                  }}
                                  className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-sm text-gray-300 flex items-center justify-between group"
                                >
                                  <span className="pr-4">{msg}</span>
                                  <Copy className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-brand-primary" />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'likes' && (
              <div className="max-w-md mx-auto">
                <Card className="text-center py-12">
                  <div className="bg-brand-surface w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner shadow-black/50">
                    <Eye className="w-10 h-10 text-brand-accent" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Who likes me?</h3>

                  {likesCount !== null ? (
                    <div className="animate-fade-in">
                      <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-brand-primary mb-2">
                        {likesCount}
                      </div>
                      <p className="text-gray-500 mb-2">People are crushing on you.</p>
                      <p className="text-xs text-gray-600">
                        Their identities are hidden until they match with you.
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500">Checking...</p>
                  )}
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}