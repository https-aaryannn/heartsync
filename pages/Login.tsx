import React, { useState } from 'react';
import { loginWithInstagram, registerWithInstagram } from '../services/firebase';
import { Card, Button } from '../components/UI';
import { Heart, Instagram, Lock, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [instagramId, setInstagramId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Only for signup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) throw new Error("Name is required.");
        if (!instagramId.trim()) throw new Error("Instagram ID is required.");
        await registerWithInstagram(instagramId, password, name);
      } else {
        if (!instagramId.trim()) throw new Error("Instagram ID is required.");
        await loginWithInstagram(instagramId, password);
      }
      navigate('/dashboard'); 
    } catch (err: any) {
      let msg = "Authentication failed.";
      if (err.message) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md py-10">
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-br from-brand-primary to-brand-secondary p-3 rounded-xl shadow-lg shadow-brand-primary/20">
             <Heart className="w-10 h-10 text-white fill-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2 text-center">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-gray-400 mb-8 text-center">
          {isSignUp 
            ? 'Join the sync and find your match.' 
            : 'Sign in with your Instagram ID.'}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="relative">
              <UserIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display Name"
                className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all placeholder-gray-600"
              />
            </div>
          )}
          
          <div className="relative">
            <Instagram className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
            <input
              type="text"
              value={instagramId}
              onChange={(e) => setInstagramId(e.target.value)}
              placeholder="Instagram ID (e.g. @username)"
              className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all placeholder-gray-600"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (Optional)"
              className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all placeholder-gray-600"
            />
          </div>

          <Button fullWidth type="submit" disabled={loading}>
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button 
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setPassword('');
              }}
              className="text-brand-primary hover:text-brand-secondary font-medium transition-colors"
            >
              {isSignUp ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}