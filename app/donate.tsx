import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS, SPACING } from '@/constants/theme';
import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function DonateScreen() {
    const handleBuyCoffee = () => {
        Linking.openURL('https://buymeacoffee.com/sudoflow');
    };

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <IconSymbol name="heart.fill" size={80} color={COLORS.primary} />
            </View>

            <Text style={styles.title}>Support Development</Text>

            <Text style={styles.description}>
                This Sudoku app is completely free, private, and designed for a clean, distraction-free experience.
            </Text>

            <Text style={styles.description}>
                If you enjoy playing and would like to support the continued development, consider buying me a coffee!
            </Text>

            <TouchableOpacity style={styles.button} onPress={handleBuyCoffee}>
                <Text style={styles.buttonText}>☕ Buy Me a Coffee</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
        backgroundColor: COLORS.surface,
    },
    iconContainer: {
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: SPACING.l,
        textAlign: 'center',
        color: COLORS.text,
    },
    description: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.l,
        lineHeight: 24,
    },
    button: {
        backgroundColor: '#FFDD00', // Buy Me a Coffee brand color
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 25,
        marginTop: SPACING.m,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
});
