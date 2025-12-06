import React, { useEffect, useState } from 'react';
import { User } from '../services/firebase';
import { Period, Crush, Match } from '../types';
import { getMyCrushes, getWhoLikesMeCount, getMyMatches } from '../services/firebase';
import { Card, Button } from '../components/UI';
import { Heart, Users, Eye, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard({ user, activePeriod }: { user: User, activePeriod: Period | null }) {
  const [activeTab, setActiveTab] = useState<'crushes' | 'matches' | 'likes'>('crushes');
  const [myCrushes, setMyCrushes] = useState<Crush[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [likesCount, setLikesCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial Data Load
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [c, m] = await Promise.all([
          getMyCrushes(user.uid),
          getMyMatches(user.uid)
        ]);
        setMyCrushes(c);
        setMatches(m);
      } catch (e) {
        console.error("Error loading dashboard data:", e);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) fetchData();
  }, [user]); // Re-run if user changes

  // Auto-fetch likes count
  useEffect(() => {
    const fetchLikes = async () => {
      if (activePeriod && user.instagramId) {
        const count = await getWhoLikesMeCount(user.instagramId, activePeriod.id);
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
              <div className="space-y-4">
                {myCrushes.length === 0 ? (
                  <Card className="text-center py-12 border-dashed border-white/20">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Heart className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">No crushes yet</h3>
                    <p className="text-gray-500 mb-6">It takes courage, but it's worth it.</p>
                    {activePeriod && (
                      <Link to="/submit">
                        <Button variant="outline">Add your first crush</Button>
                      </Link>
                    )}
                  </Card>
                ) : (
                  myCrushes.map(crush => (
                    <Card key={crush.id} className="flex items-center justify-between hover:bg-white/5 transition-colors">
                      <div>
                        <h3 className="text-xl font-bold text-white">{crush.targetNameDisplay}</h3>
                        <p className="text-sm text-gray-400">ID: {crush.targetInstagramId}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          crush.isMutual 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          {crush.isMutual ? 'MATCHED' : 'WAITING'}
                        </span>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {activeTab === 'matches' && (
               <div className="space-y-4">
                 {matches.length === 0 ? (
                   <div className="text-center py-12">
                     <h3 className="text-gray-400">No matches yet. Keep the faith!</h3>
                   </div>
                 ) : (
                   matches.map(match => (
                     <Card key={match.id} className="bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 border-brand-primary/30">
                       <div className="flex flex-col items-center text-center">
                         <div className="flex items-center justify-center gap-4 mb-4">
                           <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                             <span className="text-2xl">You</span>
                           </div>
                           <Heart className="w-8 h-8 text-red-500 fill-red-500 animate-pulse" />
                           <div className="w-16 h-16 rounded-full bg-brand-secondary flex items-center justify-center overflow-hidden">
                             <span className="text-xl font-bold">{(match.userBId === user.uid ? match.userAName : match.userBName).charAt(0)}</span>
                           </div>
                         </div>
                         <h3 className="text-2xl font-bold text-white mb-2">
                           It's a Match!
                         </h3>
                         <p className="text-gray-300 mb-4">
                           You and <span className="text-brand-secondary font-bold">{match.userBId === user.uid ? match.userAName : match.userBName}</span> like each other.
                         </p>
                         <Button variant="primary">Send Message (Coming Soon)</Button>
                       </div>
                     </Card>
                   ))
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