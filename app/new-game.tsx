import { useThemeColor } from '@/hooks/use-theme-color';
import { saveBoard, saveTimer } from '@/utils/storage';
import { Difficulty, generateSudoku } from '@/utils/sudoku';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NewGameScreen() {
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const primaryColor = useThemeColor({}, 'primary');
    const textSecondaryColor = useThemeColor({}, 'textSecondary');

    const startNewGame = async (difficulty: Difficulty) => {
        setIsGenerating(true);
        // Allow UI to update before heavy generation
        setTimeout(async () => {
            try {
                const { puzzle: newBoard, solution } = generateSudoku(difficulty);

                const newInitialBoard = newBoard.map(row => row.map(cell => cell !== 0));

                await saveBoard({
                    board: newBoard,
                    initialBoard: newInitialBoard,
                    difficulty,
                    solution,
                    mistakes: 0,
                    isFailed: false
                });
                await saveTimer(0);

                // Navigate back to the home/play tab
                router.replace('/');
            } catch (error) {
                console.error('Failed to generate game:', error);
                setIsGenerating(false);
            }
        }, 100);
    };

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <Text style={[styles.title, { color: textColor }]}>Choose Difficulty</Text>
            <View style={styles.buttonContainer}>
                {(['Easy', 'Medium', 'Hard', 'Expert'] as Difficulty[]).map((diff) => (
                    <TouchableOpacity
                        key={diff}
                        style={[styles.button, { backgroundColor: primaryColor }, isGenerating && styles.buttonDisabled]}
                        onPress={() => startNewGame(diff)}
                        disabled={isGenerating}
                    >
                        <Text style={styles.buttonText}>{diff}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            {isGenerating && <ActivityIndicator size="large" color={primaryColor} style={styles.loader} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
    },
    buttonContainer: {
        width: '100%',
        gap: 15,
        marginBottom: 30,
    },
    button: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    cancelButton: {
        padding: 15,
    },
    cancelButtonText: {
        fontSize: 16,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    loader: {
        marginTop: 20,
    },
});
