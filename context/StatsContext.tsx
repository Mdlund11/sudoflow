import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSettings } from './SettingsContext';

export interface GameStats {
    completedGames: {
        Easy: number;
        Medium: number;
        Hard: number;
        Expert: number;
    };
    currentStreak: number;
    longestStreak: number;
    lastCompletedDate: string | null; // YYYY-MM-DD
}

interface StatsContextType {
    stats: GameStats;
    recordGameCompletion: (difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert') => Promise<{ totalGames: number; currentStreak: number }>;
    resetStats: () => Promise<void>;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

const INITIAL_STATS: GameStats = {
    completedGames: {
        Easy: 0,
        Medium: 0,
        Hard: 0,
        Expert: 0,
    },
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: null,
};

export const StatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
    const { streakTrackingEnabled } = useSettings();

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const savedStats = await AsyncStorage.getItem('sudoku_stats');
            if (savedStats) {
                const parsedStats = JSON.parse(savedStats);
                // Validate streak at startup
                const validatedStats = validateStreak(parsedStats);
                setStats(validatedStats);
                if (JSON.stringify(validatedStats) !== savedStats) {
                    await AsyncStorage.setItem('sudoku_stats', JSON.stringify(validatedStats));
                }
            }
        } catch (e) {
            console.error('Failed to load stats', e);
        }
    };

    const validateStreak = (currentStats: GameStats): GameStats => {
        if (!currentStats.lastCompletedDate) return currentStats;

        const today = new Date().toISOString().split('T')[0];
        const lastDate = currentStats.lastCompletedDate;

        if (today === lastDate) return currentStats;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastDate !== yesterdayStr) {
            // Streak broken
            return {
                ...currentStats,
                currentStreak: 0,
            };
        }

        return currentStats;
    };

    const recordGameCompletion = async (difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert') => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const newStats = { ...stats };

            // Increment difficulty count
            newStats.completedGames[difficulty]++;

            // Handle streak
            if (streakTrackingEnabled) {
                const lastDate = newStats.lastCompletedDate;

                if (lastDate === null) {
                    // First game ever
                    newStats.currentStreak = 1;
                } else if (lastDate === today) {
                    // Already played today, streak stays the same
                } else {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    if (lastDate === yesterdayStr) {
                        // Consecutive day
                        newStats.currentStreak++;
                    } else {
                        // Streak was broken, start new one
                        newStats.currentStreak = 1;
                    }
                }

                if (newStats.currentStreak > newStats.longestStreak) {
                    newStats.longestStreak = newStats.currentStreak;
                }
                newStats.lastCompletedDate = today;
            }

            setStats(newStats);
            await AsyncStorage.setItem('sudoku_stats', JSON.stringify(newStats));

            const totalGames = Object.values(newStats.completedGames).reduce((a, b) => a + b, 0);
            return { totalGames, currentStreak: newStats.currentStreak };
        } catch (e) {
            console.error('Failed to record game completion', e);
            return { totalGames: 0, currentStreak: 0 };
        }
    };

    const resetStats = async () => {
        try {
            setStats(INITIAL_STATS);
            await AsyncStorage.removeItem('sudoku_stats');
        } catch (e) {
            console.error('Failed to reset stats', e);
        }
    };

    return (
        <StatsContext.Provider value={{ stats, recordGameCompletion, resetStats }}>
            {children}
        </StatsContext.Provider>
    );
};

export const useStats = () => {
    const context = useContext(StatsContext);
    if (context === undefined) {
        throw new Error('useStats must be used within a StatsProvider');
    }
    return context;
};
