import { Tabs, useRouter } from 'expo-router';
import { Image, Platform, Text, View } from 'react-native';

import { HamburgerMenu } from '@/components/HamburgerMenu';
import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const primaryColor = useThemeColor({}, 'primary');
    const tintColor = Colors[colorScheme ?? 'light'].tint;
    const surfaceColor = useThemeColor({}, 'surface');
    const borderColor = useThemeColor({}, 'border');

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: primaryColor,
                headerShown: false,
                tabBarButton: HapticTab,
                tabBarShowLabel: false,
                tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
                tabBarStyle: Platform.select({
                    ios: {
                        display: 'none',
                        position: 'absolute',
                        bottom: 0,
                        height: 80,
                        paddingBottom: 20,
                        backgroundColor: surfaceColor,
                        borderTopColor: borderColor,
                    },
                    default: {
                        display: 'none',
                        height: 60,
                        paddingBottom: 10,
                        backgroundColor: surfaceColor,
                        borderTopColor: borderColor,
                    },
                }),
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: '',
                    headerTitle: () => (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontSize: 24, color: primaryColor, fontWeight: '400' }}>sudo</Text>
                            <Text style={{ fontSize: 24, color: primaryColor, fontWeight: '600' }}>flow</Text>
                        </View>
                    ),
                    headerTitleAlign: 'center',
                    headerTintColor: primaryColor,
                    headerStyle: {
                        backgroundColor: surfaceColor,
                    },
                    headerShown: true,
                    tabBarIcon: () => <Image source={require('@/assets/images/icon.png')} style={{ width: 32, height: 32 }} />,
                    headerLeft: () => <HamburgerMenu />,
                }}
            />
        </Tabs>
    );
}
