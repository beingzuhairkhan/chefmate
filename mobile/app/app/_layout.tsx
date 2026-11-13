import { Stack, usePathname, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarRange, Compass, Home, ShoppingCart, Sparkles } from 'lucide-react-native';
import { colors } from '@/theme';

const tabs = [
  { route: '/app', label: 'Home', icon: Home, exact: true },
  { route: '/app/discover', label: 'Discover', icon: Compass },
  { route: '/app/ai-kitchen', label: 'AI Kitchen', icon: Sparkles },
  { route: '/app/planner', label: 'Planner', icon: CalendarRange },
  { route: '/app/grocery', label: 'Grocery', icon: ShoppingCart },
];

function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#FFFFFFF7', borderTopWidth: 1, borderTopColor: colors.forest100, paddingTop: 8, paddingBottom: Math.max(8, insets.bottom), paddingHorizontal: 2 }}>
      {tabs.map(({ route, label, icon: Icon, exact }) => {
        const active = exact ? pathname === route || pathname === `${route}/` : pathname.startsWith(route);
        return (
          <Pressable key={route} onPress={() => router.replace(route as never)} accessibilityRole="button" accessibilityLabel={label} style={{ alignItems: 'center', minWidth: 54, gap: 3, paddingHorizontal: 3 }}>
            <Icon size={20} color={active ? colors.forest700 : colors.charcoalMute} strokeWidth={active ? 2.2 : 1.8} />
            <Text style={{ color: active ? colors.forest700 : colors.charcoalMute, fontSize: 9, fontWeight: '500' }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function AppLayout() {
  return <View style={{ flex: 1 }}>
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream }, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="discover" />
      <Stack.Screen name="ai-kitchen" />
      <Stack.Screen name="scanner" />
      <Stack.Screen name="pantry" />
      <Stack.Screen name="planner" />
      <Stack.Screen name="grocery" />
      <Stack.Screen name="nutrition" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="voice" />
      <Stack.Screen name="recipe/[id]" />
    </Stack>
    <BottomNavigation />
  </View>;
}
