import SudokuBoard from '@/components/SudokuBoard';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function PuzzleScreen() {
    const { seed, difficulty } = useLocalSearchParams<{ seed?: string; difficulty?: string }>();

    return (
        <SudokuBoard seed={seed} initialDifficulty={difficulty as any} />
    );
}
