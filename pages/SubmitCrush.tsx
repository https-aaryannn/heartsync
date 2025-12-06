import React, { useState } from 'react';
import { User } from '../services/firebase';
import { Period, VisibilityMode } from '../types';
import { submitCrush } from '../services/firebase';
import { Card, Button, Input } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Ghost, Heart, CheckCircle2 } from 'lucide-react';

export default function SubmitCrush({ user, activePeriod }: { user: User, activePeriod: Period | null }) {
  const navigate = useNavigate();
  const [targetName, setTargetName] = useState('');
  const [targetInstagramId, setTargetInstagramId] = useState('');
  const [visibility, setVisibility] = useState<VisibilityMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetName.trim()) {
      setError('Please enter a name.');
      return;
    }
    if (!targetInstagramId.trim()) {
      setError('Please enter their Instagram ID.');
      return;
    }
    if (!activePeriod) {
      setError('No active period.');
      return;
    }
    if (!visibility) {
      setError('Please select a submission method.');
      return;
    }

    setLoading(true);
    try {
      // Map user to UserProfile shape
      // We rely on the user object passed prop which is from onAuthStateChanged
      // It should have instagramUsername now.
      const userProfile = {
        uid: user.uid,
        instagramUsername: user.instagramUsername || user.instagramId, // Support both for safety
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: 0
      };

      const result = await submitCrush(
        userProfile,
        targetName,
        targetName,
        targetInstagramId,
        activePeriod.id,
        visibility
      );

      if (result.matchFound) {
        // We can show a confetti or a special modal here
        alert("IT'S A MATCH! ❤️ check your dashboard.");
      } else {
        alert("Crush submitted secretly! We'll let you know if it matches.");
      }

      navigate('/dashboard');
    } catch (err: any) {
      if (err.message === "Already submitted") {
        alert("You already submitted this crush!");
        navigate('/dashboard');
        return;
      }
      setError(err.message || 'Failed to submit. Try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!activePeriod) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="text-center">
          <h2 className="text-xl font-bold">No Active Season</h2>
          <p className="text-gray-400">You cannot submit crushes right now.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-primary">
          New Crush
        </h1>
        <p className="text-gray-400">
          Shoot your shot. We keep it safe.
        </p>
      </div>

      <Card className="p-6 md:p-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Inputs Section */}
          <div className="space-y-6">
            <Input
              label="Their Name"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              placeholder=""
            />

            <div>
              <Input
                label="Their Instagram ID"
                value={targetInstagramId}
                onChange={(e) => setTargetInstagramId(e.target.value.toLowerCase().trim())}
                placeholder=""
              />
              <p className="text-xs text-gray-500 mt-1">
                Required to match you if they like you back.
              </p>
            </div>
          </div>

          <div className="border-t border-white/5 my-6"></div>

          {/* Selection Section */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 text-center">How do you want to submit your crush?</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Anonymous */}
              <button
                type="button"
                onClick={() => setVisibility(VisibilityMode.ANON_COUNT)}
                className={`relative p-6 rounded-xl border-2 text-left transition-all duration-200 group flex flex-col items-center text-center gap-3 ${visibility === VisibilityMode.ANON_COUNT
                  ? 'bg-brand-primary/10 border-brand-primary shadow-[0_0_20px_rgba(255,105,180,0.15)]'
                  : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                  }`}
              >
                <div className={`p-3 rounded-full ${visibility === VisibilityMode.ANON_COUNT ? 'bg-brand-primary text-white' : 'bg-gray-800 text-gray-400 group-hover:bg-gray-700'}`}>
                  <Ghost className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Submit Anonymously</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Your identity will remain hidden unless both of you submit each other.
                  </p>
                </div>
              </button>

              {/* Option 2: Mutual Reveal */}
              <button
                type="button"
                onClick={() => setVisibility(VisibilityMode.MUTUAL_ONLY)}
                className={`relative p-6 rounded-xl border-2 text-left transition-all duration-200 group flex flex-col items-center text-center gap-3 ${visibility === VisibilityMode.MUTUAL_ONLY
                  ? 'bg-brand-secondary/10 border-brand-secondary shadow-[0_0_20px_rgba(147,51,234,0.15)]'
                  : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                  }`}
              >
                <div className={`p-3 rounded-full ${visibility === VisibilityMode.MUTUAL_ONLY ? 'bg-brand-secondary text-white' : 'bg-gray-800 text-gray-400 group-hover:bg-gray-700'}`}>
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Reveal Only If Mutual</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Your identity will be revealed only if there is a mutual crush.
                  </p>
                </div>
              </button>
            </div>

            {/* Confirmation Message */}
            <div className={`mt-6 text-center transition-opacity duration-300 ${visibility ? 'opacity-100' : 'opacity-0'}`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-brand-primary font-medium text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  You selected: <span className="text-white">{visibility === VisibilityMode.ANON_COUNT ? 'Submit Anonymously' : 'Reveal Only If Mutual'}</span>
                </span>
              </div>
            </div>
          </div>

          <Button fullWidth size="lg" type="submit" disabled={loading || !visibility} variant={!visibility ? 'secondary' : 'primary'}>
            {loading ? 'Confirm Crush' : 'Confirm Crush'}
          </Button>
        </form>
      </Card>
    </div>
  );
}