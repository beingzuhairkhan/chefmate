import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { AlertTriangle, Check, ChefHat, Info, X } from 'lucide-react-native';
import { colors, styles } from '@/theme';
import type { Recipe } from '@/types';

type ToastKind = 'success' | 'error' | 'info';
type ToastContextValue = (message: string, type?: ToastKind) => void;
const ToastContext = createContext<ToastContextValue>(() => undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastKind } | null>(null);
  const show = useCallback((message: string, type: ToastKind = 'success') => setToast({ message, type }), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);
  const Icon = toast?.type === 'error' ? AlertTriangle : toast?.type === 'info' ? Info : Check;
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <View accessibilityRole="alert" style={{ position: 'absolute', bottom: 94, left: 16, right: 16, zIndex: 100, backgroundColor: colors.charcoal, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, elevation: 8 }}>
          <Icon size={18} color={toast.type === 'error' ? colors.accent300 : colors.forest300} />
          <Text style={{ color: colors.cream, fontSize: 14, flex: 1 }}>{toast.message}</Text>
          <Pressable onPress={() => setToast(null)} accessibilityLabel="Dismiss"><X size={16} color={colors.cream} /></Pressable>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

export function Button({
  children,
  onPress,
  secondary = false,
  disabled = false,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [{
        backgroundColor: secondary ? colors.white : colors.forest700,
        borderColor: secondary ? colors.forest100 : colors.forest700,
        borderWidth: secondary ? 1 : 0,
        borderRadius: 28,
        minHeight: 48,
        paddingHorizontal: 18,
        paddingVertical: 13,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        opacity: disabled ? 0.55 : pressed ? 0.8 : 1,
      }, style]}
    >
      {children}
    </Pressable>
  );
}

export function ButtonText({ children, color = colors.cream, style }: { children: React.ReactNode; color?: string; style?: object }) {
  return <Text style={[{ color, fontFamily: 'Inter_600SemiBold', fontSize: 14, fontWeight: '600', textAlign: 'center' }, style]}>{children}</Text>;
}

export function Field({
  label,
  style,
  containerStyle,
  ...props
}: TextInputProps & {
  label?: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={containerStyle}>
      {label && <Text style={{ color: colors.charcoalSoft, fontSize: 12, fontWeight: '600', marginBottom: 7 }}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.charcoalMute}
        {...props}
        style={[styles.input, { fontFamily: 'Inter_400Regular' }, style]}
      />
    </View>
  );
}

export function Pill({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ borderRadius: 22, paddingHorizontal: 13, paddingVertical: 8, marginRight: 7, marginBottom: 7, backgroundColor: active ? colors.forest700 : colors.white, borderWidth: 1, borderColor: active ? colors.forest700 : colors.forest100 }}>
      <Text style={{ color: active ? colors.cream : colors.charcoalSoft, fontSize: 12, fontWeight: active ? '600' : '500' }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label = 'Demo mode' }: { label?: string }) {
  return <View style={{ alignSelf: 'flex-start', borderRadius: 12, backgroundColor: colors.accent50, borderWidth: 1, borderColor: colors.accent100, paddingHorizontal: 9, paddingVertical: 5 }}><Text style={{ color: colors.accent600, fontSize: 9, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' }}>{label}</Text></View>;
}

export function SectionTitle({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return <View style={{ alignItems: 'center', padding: 28, backgroundColor: colors.white, borderRadius: 20, marginVertical: 12 }}>
    <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><ChefHat size={25} color={colors.forest600} /></View>
    <Text style={{ color: colors.charcoal, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
    <Text style={{ color: colors.charcoalSoft, textAlign: 'center', fontSize: 13, lineHeight: 20, marginTop: 6 }}>{message}</Text>
    {action && <View style={{ marginTop: 16, alignSelf: 'stretch' }}>{action}</View>}
  </View>;
}

export function ConfirmModal({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  destructive = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <Pressable onPress={onCancel} style={{ flex: 1, backgroundColor: '#20272066', justifyContent: 'flex-end', padding: 16 }}>
      <Pressable onPress={(event) => event.stopPropagation()} style={{ backgroundColor: colors.white, borderRadius: 26, padding: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          {destructive && <AlertTriangle size={20} color={colors.accent600} />}
          <Text style={{ color: colors.charcoal, fontSize: 20, fontWeight: '700', flex: 1 }}>{title}</Text>
          <Pressable onPress={onCancel}><X size={18} color={colors.charcoalMute} /></Pressable>
        </View>
        <Text style={{ color: colors.charcoalSoft, fontSize: 14, lineHeight: 21, marginBottom: 20 }}>{message}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button secondary onPress={onCancel} style={{ flex: 1 }}><ButtonText color={colors.forest700}>Cancel</ButtonText></Button>
          <Button onPress={onConfirm} style={{ flex: 1, backgroundColor: destructive ? colors.accent600 : colors.forest700 }}><ButtonText>Confirm</ButtonText></Button>
        </View>
      </Pressable>
    </Pressable>
  </Modal>;
}

export function RecipeTile({ recipe, onPress, onFavorite }: { recipe: Recipe; onPress: () => void; onFavorite: () => void }) {
  return <Pressable onPress={onPress} style={{ backgroundColor: colors.white, borderRadius: 20, overflow: 'hidden', marginBottom: 14, elevation: 2 }}>
    <View>
      <Image source={{ uri: recipe.image } as ImageSourcePropType} style={{ height: 190, width: '100%' }} resizeMode="cover" />
      <Pressable onPress={onFavorite} style={{ position: 'absolute', top: 12, right: 12, borderRadius: 20, padding: 9, backgroundColor: '#FFFFFFE8' }}><Text style={{ fontSize: 16, color: recipe.isFavorite ? colors.accent500 : colors.charcoalSoft }}>{recipe.isFavorite ? '♥' : '♡'}</Text></Pressable>
      <View style={{ position: 'absolute', bottom: 10, left: 10, backgroundColor: '#FFFFFFE8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 }}>
        <Text style={{ color: colors.charcoal, fontSize: 11 }}>{recipe.prepTime + recipe.cookingTime} min</Text>
      </View>
    </View>
    <View style={{ padding: 15 }}>
      <Text style={{ color: colors.accent600, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{recipe.cuisine} · {recipe.difficulty}</Text>
      <Text numberOfLines={1} style={{ color: colors.charcoal, fontSize: 17, fontWeight: '700', marginTop: 5 }}>{recipe.title}</Text>
      <Text numberOfLines={2} style={{ color: colors.charcoalSoft, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{recipe.description}</Text>
    </View>
  </Pressable>;
}

export function HorizontalChips({ children }: { children: React.ReactNode }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView>;
}
