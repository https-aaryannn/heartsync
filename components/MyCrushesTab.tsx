import React, { useEffect, useState } from 'react';
import { Card, Button } from './UI';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { User, subscribeToMyCrushes } from '../services/firebase';
import { Crush, Period } from '../types';

interface MyCrushesTabProps {
    user: User;
    activePeriod: Period | null;
}

export default function MyCrushesTab({ user, activePeriod }: MyCrushesTabProps) {
    const [myCrushes, setMyCrushes] = useState<Crush[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !user.instagramUsername || !activePeriod) return;

        setLoading(true);

        const unsubscribe = subscribeToMyCrushes(
            user.instagramUsername,
            activePeriod.id,
            (crushes) => {
                setMyCrushes(crushes);
                setLoading(false);
            },
            (error) => {
                console.error("Error subscribing to crushes:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user]);

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {myCrushes.length === 0 ? (
                <Card className="text-center py-12 border-dashed border-white/20">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Heart className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-300 mb-2">No crushes yet</h3>
                    <p className="text-gray-500 mb-6">It takes courage, but it's worth it.</p>
                    {activePeriod ? (
                        <Link to="/submit">
                            <Button variant="outline">Add your first crush</Button>
                        </Link>
                    ) : (
                        <p className="text-sm text-gray-600">Wait for the next season to start!</p>
                    )}
                </Card>
            ) : (
                myCrushes.map(crush => (
                    <Card key={crush.id} className="group hover:bg-white/5 transition-colors border-l-4 border-l-transparent hover:border-l-brand-primary">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-xl font-bold text-white">{crush.targetNameDisplay || crush.targetName}</h3>
                                    <span className="text-sm text-gray-500 bg-white/5 px-2 py-0.5 rounded">{crush.targetInstagram}</span>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    {crush.visibilityMode === 'ANON_COUNT' ? (
                                        <span className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary"></div>
                                            Submitted Anonymously
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-secondary"></div>
                                            Reveal If Mutual
                                        </span>
                                    )}
                                    <span className="text-gray-600">•</span>
                                    <span>{new Date(crush.createdAt as any).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="flex items-center">
                                {crush.isMutual ? (
                                    <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)] flex items-center gap-2">
                                        <Heart className="w-4 h-4 fill-current" />
                                        Matched ❤️
                                    </span>
                                ) : (
                                    <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                                        Waiting
                                    </span>
                                )}
                            </div>
                        </div>
                    </Card>
                ))
            )}
        </div>
    );
}
