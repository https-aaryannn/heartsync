import React, { useState } from 'react';
import { User } from '../services/firebase';
import { Period, VisibilityMode } from '../types';
import { submitCrush } from '../services/firebase';
import { Card, Button, Input } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export default function SubmitCrush({ user, activePeriod }: { user: User, activePeriod: Period | null }) {
  const navigate = useNavigate();
  const [targetName, setTargetName] = useState('');
  const [targetInstagramId, setTargetInstagramId] = useState('');
  const [visibility, setVisibility] = useState<VisibilityMode>(VisibilityMode.MUTUAL_ONLY);
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

    setLoading(true);
    try {
      // Map user to UserProfile shape
      const userProfile = {
        uid: user.uid,
        instagramId: user.instagramId,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: 0
      };
      
      const result = await submitCrush(
        userProfile, 
        targetName, 
        targetName, 
        targetInstagramId, // Pass the new ID
        activePeriod.id, 
        visibility
      );
      
      if (result.matchFound) {
        alert("It's a match! Check your dashboard.");
      }
      
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to submit. Try again.');
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
    <div className="max-w-xl mx-auto px-4 py-12">
      <Card>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Who caught your eye?</h1>
          <p className="text-gray-400 text-sm">Be honest. It's mostly anonymous.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            label="Their Name"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            placeholder="e.g., Jane Smith"
          />

          <Input 
            label="Their Instagram ID"
            value={targetInstagramId}
            onChange={(e) => setTargetInstagramId(e.target.value)}
            placeholder="e.g., @jane.smith"
          />
          <p className="text-xs text-gray-500 -mt-4 mb-2">
            Required for mutual match detection.
          </p>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-400">Visibility Settings</label>
            
            <label className="flex items-start p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer transition-colors">
              <input 
                type="radio" 
                name="vis" 
                className="mt-1 mr-3 text-brand-primary focus:ring-brand-primary"
                checked={visibility === VisibilityMode.ANON_COUNT}
                onChange={() => setVisibility(VisibilityMode.ANON_COUNT)}
              />
              <div>
                <span className="block text-white font-medium">Anonymous Count Only</span>
                <span className="text-xs text-gray-500">They will just see "+1 crush". Your name is never revealed.</span>
              </div>
            </label>

            <label className="flex items-start p-3 rounded-lg border border-brand-primary/30 bg-brand-primary/5 cursor-pointer transition-colors">
              <input 
                type="radio" 
                name="vis" 
                className="mt-1 mr-3 text-brand-primary focus:ring-brand-primary"
                checked={visibility === VisibilityMode.MUTUAL_ONLY}
                onChange={() => setVisibility(VisibilityMode.MUTUAL_ONLY)}
              />
              <div>
                <span className="block text-white font-medium">Reveal if Mutual</span>
                <span className="text-xs text-gray-500">Recommended. Your name is revealed ONLY if they also submit a crush on you.</span>
              </div>
            </label>
            
            <label className="flex items-start p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer transition-colors">
              <input 
                type="radio" 
                name="vis" 
                className="mt-1 mr-3 text-brand-primary focus:ring-brand-primary"
                checked={visibility === VisibilityMode.REVEAL_AFTER_PERIOD}
                onChange={() => setVisibility(VisibilityMode.REVEAL_AFTER_PERIOD)}
              />
              <div>
                <span className="block text-white font-medium">Reveal After Season</span>
                <span className="text-xs text-gray-500">Your name is shown to them when the season ends.</span>
              </div>
            </label>
          </div>

          <Button fullWidth type="submit" disabled={loading}>
            {loading ? 'Syncing...' : 'Submit Crush'}
          </Button>
        </form>
      </Card>
    </div>
  );
}