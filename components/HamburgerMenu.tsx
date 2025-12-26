import { IconSymbol } from '@/components/ui/icon-symbol';
import { RADIUS, SHADOWS, SPACING } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

export const HamburgerMenu = () => {
    const [visible, setVisible] = useState(false);
    const router = useRouter();

    const primaryColor = useThemeColor({}, 'primary');
    const surfaceColor = useThemeColor({}, 'surface');
    const textColor = useThemeColor({}, 'text');
    const borderColor = useThemeColor({}, 'border');

    const handlePress = (route: string) => {
        setVisible(false);
        router.push(route as any);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={() => setVisible(true)} style={styles.button}>
                <IconSymbol name="line.3.horizontal" size={28} color={primaryColor} />
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setVisible(false)}>
                    <View style={styles.overlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.menu, { backgroundColor: surfaceColor }]}>
                                <TouchableOpacity
                                    style={styles.menuItem}
                                    onPress={() => handlePress('/settings')}
                                >
                                    <IconSymbol name="gear" size={24} color={textColor} style={styles.menuIcon} />
                                    <Text style={[styles.menuText, { color: textColor }]}>Settings</Text>
                                </TouchableOpacity>
                                <View style={[styles.divider, { backgroundColor: borderColor }]} />
                                <TouchableOpacity
                                    style={styles.menuItem}
                                    onPress={() => handlePress('/donate')}
                                >
                                    <IconSymbol name="heart.fill" size={24} color={textColor} style={styles.menuIcon} />
                                    <Text style={[styles.menuText, { color: textColor }]}>Donate</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginLeft: SPACING.m,
    },
    button: {
        padding: SPACING.s,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    menu: {
        marginTop: 100, // Adjust based on header height
        marginLeft: SPACING.m,
        borderRadius: RADIUS.m,
        padding: SPACING.s,
        minWidth: 200,
        ...SHADOWS.medium,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.m,
    },
    menuIcon: {
        marginRight: SPACING.m,
    },
    menuText: {
        fontSize: 16,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        marginHorizontal: SPACING.m,
    },
});
