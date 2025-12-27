import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface SettingsContextType {
    highlightEnabled: boolean;
    toggleHighlight: () => void;
    autoRemoveNotes: boolean;
    toggleAutoRemoveNotes: () => void;
    hideSolvedNumbers: boolean;
    toggleHideSolvedNumbers: () => void;
    completionAnimationsEnabled: boolean;
    toggleCompletionAnimations: () => void;
    streakTrackingEnabled: boolean;
    toggleStreakTracking: () => void;
    mistakeLimitEnabled: boolean;
    toggleMistakeLimit: () => void;
    maxMistakes: number;
    setMaxMistakes: (value: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [highlightEnabled, setHighlightEnabled] = useState(true);
    const [autoRemoveNotes, setAutoRemoveNotes] = useState(true);
    const [hideSolvedNumbers, setHideSolvedNumbers] = useState(true);
    const [completionAnimationsEnabled, setCompletionAnimationsEnabled] = useState(true);
    const [streakTrackingEnabled, setStreakTrackingEnabled] = useState(true);
    const [mistakeLimitEnabled, setMistakeLimitEnabled] = useState(true);
    const [maxMistakes, setMaxMistakesState] = useState(3);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedHighlight = await AsyncStorage.getItem('settings_highlightEnabled');
            if (savedHighlight !== null) {
                setHighlightEnabled(JSON.parse(savedHighlight));
            }
            const savedAutoRemove = await AsyncStorage.getItem('settings_autoRemoveNotes');
            if (savedAutoRemove !== null) {
                setAutoRemoveNotes(JSON.parse(savedAutoRemove));
            }
            const savedHideSolved = await AsyncStorage.getItem('settings_hideSolvedNumbers');
            if (savedHideSolved !== null) {
                setHideSolvedNumbers(JSON.parse(savedHideSolved));
            }
            const savedCompletionAnimations = await AsyncStorage.getItem('settings_completionAnimationsEnabled');
            if (savedCompletionAnimations !== null) {
                setCompletionAnimationsEnabled(JSON.parse(savedCompletionAnimations));
            }
            const savedStreakTracking = await AsyncStorage.getItem('settings_streakTrackingEnabled');
            if (savedStreakTracking !== null) {
                setStreakTrackingEnabled(JSON.parse(savedStreakTracking));
            }
            const savedMistakeLimit = await AsyncStorage.getItem('settings_mistakeLimitEnabled');
            if (savedMistakeLimit !== null) {
                setMistakeLimitEnabled(JSON.parse(savedMistakeLimit));
            }
            const savedMaxMistakes = await AsyncStorage.getItem('settings_maxMistakes');
            if (savedMaxMistakes !== null) {
                setMaxMistakesState(JSON.parse(savedMaxMistakes));
            }
        } catch (e) {
            console.error('Failed to load settings', e);
        }
    };

    const toggleHighlight = async () => {
        try {
            const newValue = !highlightEnabled;
            setHighlightEnabled(newValue);
            await AsyncStorage.setItem('settings_highlightEnabled', JSON.stringify(newValue));
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    };

    const toggleAutoRemoveNotes = async () => {
        try {
            const newValue = !autoRemoveNotes;
            setAutoRemoveNotes(newValue);
            await AsyncStorage.setItem('settings_autoRemoveNotes', JSON.stringify(newValue));
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    };

    const toggleHideSolvedNumbers = async () => {
        try {
            const newValue = !hideSolvedNumbers;
            setHideSolvedNumbers(newValue);
            await AsyncStorage.setItem('settings_hideSolvedNumbers', JSON.stringify(newValue));
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    };

    const toggleCompletionAnimations = async () => {
        try {
            const newValue = !completionAnimationsEnabled;
            setCompletionAnimationsEnabled(newValue);
            await AsyncStorage.setItem('settings_completionAnimationsEnabled', JSON.stringify(newValue));
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    };

    const toggleStreakTracking = async () => {
        try {
            const newValue = !streakTrackingEnabled;
            setStreakTrackingEnabled(newValue);
            await AsyncStorage.setItem('settings_streakTrackingEnabled', JSON.stringify(newValue));
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    };

    const toggleMistakeLimit = async () => {
        try {
            const newValue = !mistakeLimitEnabled;
            setMistakeLimitEnabled(newValue);
            await AsyncStorage.setItem('settings_mistakeLimitEnabled', JSON.stringify(newValue));
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    };

    const setMaxMistakes = async (value: number) => {
        try {
            setMaxMistakesState(value);
            await AsyncStorage.setItem('settings_maxMistakes', JSON.stringify(value));
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    };

    return (
        <SettingsContext.Provider value={{
            highlightEnabled,
            toggleHighlight,
            autoRemoveNotes,
            toggleAutoRemoveNotes,
            hideSolvedNumbers,
            toggleHideSolvedNumbers,
            completionAnimationsEnabled,
            toggleCompletionAnimations,
            streakTrackingEnabled,
            toggleStreakTracking,
            mistakeLimitEnabled,
            toggleMistakeLimit,
            maxMistakes,
            setMaxMistakes
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
