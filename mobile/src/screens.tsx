import { useMemo, useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  type StyleProp,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, ArrowRight, Bell, CalendarRange, Camera, Check, ChevronDown, ChevronRight,
  Circle, Clock, Eye, EyeOff, Heart, Image as ImageIcon, Mic, Plus, Search, Send,
  ShoppingCart, Sparkles, Trash2, Wand2, X,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { colors, styles } from '@/theme';
import {
  Badge, Button, ButtonText, ConfirmModal, EmptyState, Field, HorizontalChips,
  Pill, RecipeTile, SectionTitle, useToast,
} from '@/components';
import type {
  Category, MealSlot, MealType, Nutrition, PantryItem, Recipe, RecipeFilters, ScannedIngredient, Unit, UserPreferences, VoiceMessage,
} from '@/types';
import { CATEGORIES, MEAL_TYPES } from '@/types';
import { useAppStore, type MealPlannerInput } from '@/lib/store';
import { useAppStore as useStoreState } from '@/lib/store';
import {
  DEMO_TRANSCRIPTS, VOICE_LANGUAGES, analyzeRecipeNutrition, generateRecipes, isLiveBackend, modifyRecipe,
  processVoiceCommand, scanFridgeImage, speakText, transcribeAudio,
} from '@/lib/nativeServices';
import {
  addGroceryItems as addGroceryItemsToBackend,
  addPantryItem,
  confirmScannedIngredients,
  deletePantryItem,
  generateGroceryForRecipe,
  getDailyNutritionSummary,
  loadBackendState,
  login as loginWithBackend,
  loginDemo,
  logout as logoutFromBackend,
  markAllNotificationsRead,
  markNotificationRead,
  register as registerWithBackend,
  removeGroceryItem,
  refreshBackendActivity,
  runBackendExpiryCheck,
  setRecipeFavorite,
  startCookingSession,
  nextCookingStep,
  updateCookingSession,
  updateBackendProfile,
  updateGroceryItem,
  updatePantryItem,
} from '@/lib/backend';
import { generateMealPlan, groceryListFromPlan, regenerateDay, replaceMeal } from '@/lib/mealplan';
import { categoryFor, estimatePrice } from '@/lib/demoData';
import { daysUntil, formatDate, formatTime, uid } from '@/lib/utils';

const cuisines = ['Indian', 'Italian', 'Mexican', 'Japanese', 'American', 'Thai', 'Mediterranean'];
const diets = ['No restrictions', 'Vegetarian', 'Vegan', 'Pescatarian', 'Halal', 'Keto', 'Low carb'];
const aiDiets = ['Any', 'Vegetarian', 'Vegan', 'High Protein', 'Gluten-Free', 'Dairy-Free', 'Keto'];
const languages = ['English', 'Hindi (हिन्दी)', 'Tamil (தமிழ்)', 'Telugu (తెలుగు)', 'Kannada (ಕನ್ನಡ)', 'Marathi (मराठी)', 'Bengali (বাংলা)'];
const allergyOptions = ['Peanuts', 'Tree nuts', 'Dairy', 'Eggs', 'Gluten', 'Shellfish', 'Soy', 'Sesame'];
const experienceOptions = ['Beginner — just starting out', 'Intermediate — I cook a few times a week', 'Advanced — confident home chef'];
const timeOptions = ['Quick 15-minute meals', 'Weeknight 30-minute meals', 'Weekend projects (1hr+)', 'Mix of everything'];
const nutritionOptions = ['Balanced', 'High protein', 'Low calorie', 'Low sugar', 'Fiber rich'];

function Page({ children, title, subtitle, right }: { children: React.ReactNode; title?: string; subtitle?: string; right?: React.ReactNode }) {
  return <ScrollView style={styles.page} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
    {(title || subtitle || right) && <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        {title && <Text style={styles.title}>{title}</Text>}
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>}
    {children}
  </ScrollView>;
}

function Txt({ children, style, ...props }: { children: React.ReactNode; style?: TextStyle; numberOfLines?: number }) {
  const flattened = StyleSheet.flatten(style);
  const weight = String(flattened?.fontWeight ?? '400');
  const family = flattened?.fontFamily ?? (
    Number(flattened?.fontSize ?? 14) >= 23 && Number(weight) >= 600
      ? 'Fraunces_700Bold'
      : Number(weight) >= 700 ? 'Inter_700Bold' : Number(weight) >= 600 ? 'Inter_600SemiBold' : 'Inter_400Regular'
  );
  return <Text {...props} style={[{ color: colors.charcoal, fontSize: 14, fontFamily: family }, style]}>{children}</Text>;
}

function HeaderBack({ label = 'Back' }: { label?: string }) {
  const router = useRouter();
  return <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, paddingVertical: 5 }}>
    <ArrowLeft size={17} color={colors.charcoalSoft} /><Txt style={{ color: colors.charcoalSoft }}>{label}</Txt>
  </Pressable>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <Txt style={{ fontSize: 12, fontWeight: '600', color: colors.charcoalSoft, marginBottom: 8 }}>{children}</Txt>;
}

function MiniSelect({ value, options, onChange, label }: { value: string; options: string[]; onChange: (value: string) => void; label: string }) {
  return <View style={{ flex: 1, minWidth: '46%', marginBottom: 10 }}>
    <Label>{label}</Label>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {options.map((option) => <Pill key={option} label={option} active={value === option} onPress={() => onChange(option)} />)}
    </ScrollView>
  </View>;
}

function PageButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: React.ReactNode }) {
  return <Button onPress={onPress}><>{icon}<ButtonText>{label}</ButtonText></></Button>;
}

function Brand({ size = 42 }: { size?: number }) {
  return <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: 16, backgroundColor: colors.forest700 }}>
    <Text style={{ color: colors.cream, fontSize: size * 0.48 }}>♨</Text>
  </View>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ScalePressable({
  children,
  onPress,
  disabled = false,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  style: StyleProp<ViewStyle>;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animateScale = (toValue: number) => Animated.spring(scale, {
    toValue,
    useNativeDriver: true,
    speed: 28,
    bounciness: 2,
  }).start();
  return <AnimatedPressable
    onPress={onPress}
    onPressIn={() => animateScale(0.97)}
    onPressOut={() => animateScale(1)}
    disabled={disabled}
    accessibilityRole="button"
    style={[style, { transform: [{ scale }] }]}
  >
    {children}
  </AnimatedPressable>;
}

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  containerStyle,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  containerStyle?: object;
}) {
  const [visible, setVisible] = useState(false);
  return <View style={containerStyle}>
    <Label>{label}</Label>
    <View style={{ justifyContent: 'center' }}>
      <Field
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        placeholder={placeholder}
        style={{ paddingRight: 52 }}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable
        onPress={() => setVisible((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        accessibilityState={{ selected: visible }}
        hitSlop={8}
        style={{ position: 'absolute', right: 14, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        {visible ? <EyeOff size={19} color={colors.charcoalMute} /> : <Eye size={19} color={colors.charcoalMute} />}
      </Pressable>
    </View>
  </View>;
}

export function WelcomeScreen() {
  const router = useRouter();
  const toast = useToast();
  const [entering, setEntering] = useState(false);
  const titleEntrance = useRef(new Animated.Value(0)).current;
  const demoEntrance = useRef(new Animated.Value(0)).current;
  const loginEntrance = useRef(new Animated.Value(0)).current;
  const signupEntrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const entrance = Animated.stagger(110, [titleEntrance, demoEntrance, loginEntrance, signupEntrance].map((value) =>
      Animated.timing(value, { toValue: 1, duration: 360, useNativeDriver: true }),
    ));
    entrance.start();
    return () => entrance.stop();
  }, [demoEntrance, loginEntrance, signupEntrance, titleEntrance]);
  const enterDemo = async () => {
    setEntering(true);
    try {
      await loginDemo();
      toast('Demo data loaded', 'info');
      router.replace('/app');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not load demo data.', 'error');
    } finally {
      setEntering(false);
    }
  };
  return <ScrollView style={styles.page} contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 30, paddingBottom: 28 }}>
    <View style={{ alignItems: 'center', width: '100%', maxWidth: 440 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <Brand size={36} />
        <Txt style={{ fontSize: 19, fontWeight: '700' }}>ChefMate <Txt style={{ color: colors.accent500 }}>AI</Txt></Txt>
      </View>
      <View style={{ width: 280, height: 250, alignItems: 'center', justifyContent: 'center', marginTop: 14 }}>
        <View style={{ position: 'absolute', width: 194, height: 194, borderRadius: 100, backgroundColor: colors.accent100, opacity: 0.72, shadowColor: colors.accent300, shadowOpacity: 0.45, shadowRadius: 32, shadowOffset: { width: 0, height: 0 }, elevation: 8 }} />
        <LottieView
          source={require('../assets/animations/chef-cooking.json')}
          autoPlay
          loop
          resizeMode="contain"
          style={{ width: 260, height: 260 }}
        />
      </View>
      <Animated.View style={{
        alignItems: 'center',
        opacity: titleEntrance,
        transform: [{ translateY: titleEntrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}>
        <Txt style={{ textAlign: 'center', fontSize: 28, lineHeight: 35, fontWeight: '700' }}>A little more joy in every meal.</Txt>
        <Txt style={{ color: colors.charcoalSoft, textAlign: 'center', lineHeight: 21, marginTop: 8, maxWidth: 340 }}>Find recipes, make the most of your pantry, and plan meals that fit your life.</Txt>
      </Animated.View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 20, marginBottom: 21 }}>
        {[
          [Sparkles, 'AI Recipes'],
          [Camera, 'Pantry to Plate'],
          [Clock, '2-min Setup'],
        ].map(([Icon, label]) => {
          const FeatureIcon = Icon as typeof Sparkles;
          return <View key={String(label)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.forest100, paddingHorizontal: 10, paddingVertical: 8 }}>
            <FeatureIcon size={13} color={colors.forest600} />
            <Txt style={{ color: colors.forest800, fontSize: 10, fontWeight: '600' }}>{String(label)}</Txt>
          </View>;
        })}
      </View>
      <Animated.View style={{ width: '100%', opacity: demoEntrance, transform: [{ translateY: demoEntrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
        <ScalePressable onPress={() => void enterDemo()} disabled={entering} style={{ minHeight: 50, backgroundColor: colors.forest700, borderRadius: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, opacity: entering ? 0.65 : 1 }}>
          {entering ? <ActivityIndicator color={colors.cream} /> : <Sparkles size={17} color={colors.cream} />}
          <Txt style={{ color: colors.cream, fontSize: 14, fontWeight: '700' }}>{entering ? 'Preparing your demo…' : 'Explore with demo data'}</Txt>
        </ScalePressable>
      </Animated.View>
      <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 11 }}>
        <Animated.View style={{ flex: 1, opacity: loginEntrance, transform: [{ translateY: loginEntrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
          <ScalePressable onPress={() => router.push('/login')} style={{ minHeight: 48, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.forest100, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ color: colors.forest700, fontWeight: '700' }}>Log in</Txt>
          </ScalePressable>
        </Animated.View>
        <Animated.View style={{ flex: 1, opacity: signupEntrance, transform: [{ translateY: signupEntrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
          <ScalePressable onPress={() => router.push('/signup')} style={{ minHeight: 48, borderRadius: 16, backgroundColor: colors.forest100, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ color: colors.forest800, fontWeight: '700' }}>Create account</Txt>
          </ScalePressable>
        </Animated.View>
      </View>
      <Txt style={{ color: colors.charcoalMute, textAlign: 'center', fontSize: 11, lineHeight: 17, marginTop: 14, maxWidth: 320 }}>Try a sample kitchen with demo data, or log in to your own account.</Txt>
    </View>
  </ScrollView>;
}

const loginSchema = z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(6, 'Password must be at least 6 characters') });
type LoginValues = z.infer<typeof loginSchema>;

export function LoginScreen() {
  const router = useRouter();
  const toast = useToast();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const submit = async (values: LoginValues) => {
    try {
      await loginWithBackend(values.email, values.password);
      await loadBackendState();
      toast('Welcome back to ChefMate AI');
      router.replace('/app');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Login failed. Please try again.', 'error');
    }
  };
  return <Page>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 24 }}><Brand /><Txt style={{ marginTop: 7, fontSize: 19, fontWeight: '700' }}>ChefMate <Txt style={{ color: colors.accent500 }}>AI</Txt></Txt></View>
      <Txt style={{ textAlign: 'center', fontSize: 25, fontWeight: '700' }}>Welcome back</Txt>
      <Txt style={{ textAlign: 'center', color: colors.charcoalSoft, marginTop: 5, marginBottom: 26 }}>Log in to your kitchen assistant</Txt>
      <Controller control={control} name="email" render={({ field: { onChange, value } }) => <Field label="Email" value={value} onChangeText={onChange} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />} />
      {errors.email && <Txt style={{ color: colors.red, fontSize: 12, marginTop: 4 }}>{errors.email.message}</Txt>}
      <Controller control={control} name="password" render={({ field: { onChange, value } }) => <View style={{ marginTop: 14 }}>
        <Label>Password</Label>
        <View style={{ justifyContent: 'center' }}>
          <Field label={undefined} value={value} onChangeText={onChange} secureTextEntry={!passwordVisible} placeholder="••••••••" style={{ paddingRight: 52 }} autoCapitalize="none" autoCorrect={false} />
          <Pressable onPress={() => setPasswordVisible((visible) => !visible)} accessibilityRole="button" accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'} accessibilityState={{ selected: passwordVisible }} hitSlop={8} style={{ position: 'absolute', right: 14, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            {passwordVisible ? <EyeOff size={19} color={colors.charcoalMute} /> : <Eye size={19} color={colors.charcoalMute} />}
          </Pressable>
        </View>
      </View>} />
      {errors.password && <Txt style={{ color: colors.red, fontSize: 12, marginTop: 4 }}>{errors.password.message}</Txt>}
      <View style={{ marginTop: 18 }}><Button onPress={handleSubmit(submit)} disabled={isSubmitting}><ButtonText>{isSubmitting ? 'Logging in…' : 'Log in'}</ButtonText></Button></View>
      <Pressable onPress={() => router.push('/signup')} style={{ marginTop: 22 }}><Txt style={{ textAlign: 'center', color: colors.charcoalSoft }}>New to ChefMate? <Txt style={{ color: colors.forest700, fontWeight: '700' }}>Create an account</Txt></Txt></Pressable>
      <View style={{ backgroundColor: colors.accent50, borderRadius: 16, padding: 12, marginTop: 24 }}><Txt style={{ color: colors.charcoalMute, fontSize: 11, lineHeight: 17 }}>Sign in with your ChefMate account. Your session is stored securely on this device.</Txt></View>
    </KeyboardAvoidingView>
  </Page>;
}

const signupSchema = z.object({
  name: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
  confirm: z.string(),
}).refine((value) => value.password === value.confirm, { path: ['confirm'], message: 'Passwords do not match' });
type SignupValues = z.infer<typeof signupSchema>;

export function SignupScreen() {
  const router = useRouter();
  const toast = useToast();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupValues>({ resolver: zodResolver(signupSchema), defaultValues: { name: '', email: '', password: '', confirm: '' } });
  const submit = async (value: SignupValues) => {
    try {
      await registerWithBackend(value.name, value.email, value.password);
      toast('Account created — let’s set up your kitchen');
      router.push('/onboarding');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not create your account.', 'error');
    }
  };
  return <Page>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <HeaderBack />
      <View style={{ alignItems: 'center', marginVertical: 16 }}><Brand /><Txt style={{ marginTop: 7, fontSize: 19, fontWeight: '700' }}>ChefMate <Txt style={{ color: colors.accent500 }}>AI</Txt></Txt></View>
      <Txt style={{ textAlign: 'center', fontSize: 25, fontWeight: '700' }}>Create your account</Txt>
      <Txt style={{ textAlign: 'center', color: colors.charcoalSoft, marginTop: 5, marginBottom: 22 }}>Two minutes to a smarter kitchen</Txt>
      {([
        ['name', 'Name', 'Aarav Sharma', false],
        ['email', 'Email', 'you@example.com', false],
        ['password', 'Password', 'At least 8 characters', true],
        ['confirm', 'Confirm password', 'Repeat password', true],
      ] as const).map(([field, label, placeholder, secure]) => <View key={field} style={{ marginBottom: 12 }}>
        <Controller control={control} name={field} render={({ field: { onChange, value } }) => secure
          ? <PasswordField label={label} value={value} onChangeText={onChange} placeholder={placeholder} />
          : <Field label={label} value={value} onChangeText={onChange} placeholder={placeholder} autoCapitalize={field === 'email' ? 'none' : 'sentences'} keyboardType={field === 'email' ? 'email-address' : 'default'} />
        } />
        {errors[field] && <Txt style={{ color: colors.red, fontSize: 12, marginTop: 3 }}>{errors[field]?.message}</Txt>}
      </View>)}
      <Button onPress={handleSubmit(submit)} disabled={isSubmitting}><ButtonText>{isSubmitting ? 'Creating account…' : 'Create account'}</ButtonText></Button>
      <Pressable onPress={() => router.push('/login')} style={{ marginTop: 22 }}><Txt style={{ textAlign: 'center', color: colors.charcoalSoft }}>Already have an account? <Txt style={{ color: colors.forest700, fontWeight: '700' }}>Log in</Txt></Txt></Pressable>
    </KeyboardAvoidingView>
  </Page>;
}

export function OnboardingScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const complete = useAppStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? '',
    preferredLanguage: user?.preferredLanguage ?? 'English',
    dietaryPreference: user?.dietaryPreference ?? 'No restrictions',
    allergies: user?.allergies ?? [] as string[],
    favoriteCuisines: user?.favoriteCuisines ?? ['Indian'] as string[],
    cookingExperience: user?.cookingExperience ?? experienceOptions[1],
    householdSize: user?.householdSize ?? 2,
    weeklyBudget: user?.weeklyBudget ?? 60,
    cookingTimePreference: user?.cookingTimePreference ?? timeOptions[1],
    nutritionPreference: user?.nutritionPreference ?? 'Balanced',
  });
  const flip = (key: 'allergies' | 'favoriteCuisines', item: string) => setForm((old) => ({ ...old, [key]: old[key].includes(item) ? old[key].filter((value) => value !== item) : [...old[key], item] }));
  const finish = async () => {
    const defaultUser: UserPreferences = user ?? { email: 'you@example.com', name: '', preferredLanguage: 'English', dietaryPreference: 'No restrictions', allergies: [], favoriteCuisines: [], cookingExperience: experienceOptions[1], householdSize: 2, weeklyBudget: 60, cookingTimePreference: timeOptions[1], nutritionPreference: 'Balanced' };
    setSaving(true);
    try {
      const updated = await updateBackendProfile({ ...defaultUser, ...form });
      setUser(updated);
      complete();
      await loadBackendState();
      toast('Your kitchen is ready');
      router.replace('/app');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save your preferences.', 'error');
    } finally {
      setSaving(false);
    }
  };
  const title = ['Nice to meet you', 'How do you eat?', 'What do you love to cook?', 'Your kitchen rhythm', 'Household & budget'][step];
  return <Page>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><Brand size={36} /><Txt style={{ color: colors.charcoalMute, fontWeight: '600' }}>{step + 1} of 5</Txt></View>
    <View style={{ height: 5, backgroundColor: colors.forest100, borderRadius: 5, marginBottom: 24 }}><View style={{ height: 5, width: `${((step + 1) / 5) * 100}%`, backgroundColor: colors.forest600, borderRadius: 5 }} /></View>
    <Txt style={{ fontSize: 25, fontWeight: '700' }}>{title}{step === 0 && form.name ? `, ${form.name.split(' ')[0]}` : ''}</Txt>
    <Txt style={{ color: colors.charcoalSoft, lineHeight: 21, marginTop: 7, marginBottom: 22 }}>{[
      'What should we call you, and how do you prefer to chat with your assistant?',
      'Your dietary preference helps every recipe and meal plan fit your table.',
      'Pick your favorite cuisines — you can change these anytime.',
      'This shapes how ambitious your recipes and plans will be.',
      'Meal plans and grocery lists are sized and priced for your home.',
    ][step]}</Txt>
    {step === 0 && <>
      <Field label="Your name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="e.g. Aarav" />
      <View style={{ marginTop: 18 }}><Label>Preferred language</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{languages.map((language) => <Pill key={language} label={language} active={form.preferredLanguage === language} onPress={() => setForm({ ...form, preferredLanguage: language })} />)}</View></View>
    </>}
    {step === 1 && <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{diets.map((diet) => <Pill key={diet} label={diet} active={form.dietaryPreference === diet} onPress={() => setForm({ ...form, dietaryPreference: diet })} />)}</View>
      <View style={{ marginTop: 15 }}><Label>Food allergies (select all that apply)</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{allergyOptions.map((item) => <Pill key={item} label={item} active={form.allergies.includes(item)} onPress={() => flip('allergies', item)} />)}</View></View>
    </>}
    {step === 2 && <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{cuisines.concat('Chinese', 'British').map((item) => <Pill key={item} label={item} active={form.favoriteCuisines.includes(item)} onPress={() => flip('favoriteCuisines', item)} />)}</View>}
    {step === 3 && <>
      <Label>Cooking experience</Label>
      {experienceOptions.map((value) => <Pressable key={value} onPress={() => setForm({ ...form, cookingExperience: value })} style={{ backgroundColor: form.cookingExperience === value ? colors.forest50 : colors.white, borderColor: form.cookingExperience === value ? colors.forest600 : colors.forest100, borderWidth: 1, borderRadius: 15, padding: 13, marginBottom: 9 }}><Txt>{value}</Txt></Pressable>)}
      <View style={{ marginTop: 12 }}><Label>Cooking time preference</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{timeOptions.map((item) => <Pill key={item} label={item} active={form.cookingTimePreference === item} onPress={() => setForm({ ...form, cookingTimePreference: item })} />)}</View></View>
    </>}
    {step === 4 && <>
      <Label>Household size · {form.householdSize} {form.householdSize === 1 ? 'person' : 'people'}</Label>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}><Button secondary onPress={() => setForm({ ...form, householdSize: Math.max(1, form.householdSize - 1) })}><ButtonText color={colors.forest700}>−</ButtonText></Button><Button secondary onPress={() => setForm({ ...form, householdSize: Math.min(8, form.householdSize + 1) })}><ButtonText color={colors.forest700}>+</ButtonText></Button></View>
      <Label>Weekly food budget · ${form.weeklyBudget}</Label>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 15 }}>{[40, 60, 85, 120, 180, 250].map((value) => <Pill key={value} label={`$${value}`} active={form.weeklyBudget === value} onPress={() => setForm({ ...form, weeklyBudget: value })} />)}</View>
      <Label>Nutrition preference</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{nutritionOptions.map((value) => <Pill key={value} label={value} active={form.nutritionPreference === value} onPress={() => setForm({ ...form, nutritionPreference: value })} />)}</View>
    </>}
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 30, marginBottom: 20 }}>
      {step > 0 && <Button secondary onPress={() => setStep(step - 1)}><ButtonText color={colors.forest700}>Back</ButtonText></Button>}
      {step < 4 ? <Button onPress={() => setStep(step + 1)} style={{ flex: 1 }}><ButtonText>Continue</ButtonText><ArrowRight size={16} color={colors.cream} /></Button> : <Button onPress={() => void finish()} disabled={saving} style={{ flex: 1 }}><Check size={16} color={colors.cream} /><ButtonText>{saving ? 'Saving…' : 'Finish setup'}</ButtonText></Button>}
    </View>
  </Page>;
}

export function HomeScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAppStore((s) => s.user);
  const recipes = useAppStore((s) => s.recipes);
  const pantry = useAppStore((s) => s.pantry);
  const mealPlan = useAppStore((s) => s.mealPlan);
  const grocery = useAppStore((s) => s.groceryList);
  const unreadNotifications = useAppStore((s) => s.notifications.filter((item) => !item.read).length);
  const recentIds = useAppStore((s) => s.recentRecipeIds);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name.trim().split(/\s+/)[0] || 'Chef';
  const expiring = pantry.filter((item) => item.expiryDate && daysUntil(item.expiryDate) >= 0 && daysUntil(item.expiryDate) <= 3);
  const expired = pantry.filter((item) => item.expiryDate && daysUntil(item.expiryDate) < 0);
  const dayIndex = (new Date().getDay() + 6) % 7;
  const today = mealPlan?.days[dayIndex];
  const recent = recentIds.map((id) => recipes.find((recipe) => recipe.id === id)).filter((recipe): recipe is Recipe => Boolean(recipe));
  const progress = grocery?.items.length ? Math.round(grocery.items.filter((item) => item.purchased).length / grocery.items.length * 100) : 0;
  const go = (path: string) => router.push(path as never);
  return <Page>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
      <View style={{ flex: 1, minWidth: 0, marginRight: 10 }}><Txt style={{ color: colors.charcoalMute, fontSize: 13 }}>{greeting}</Txt><Txt numberOfLines={1} style={{ fontSize: 24, fontWeight: '700', marginTop: 3 }}>{firstName} — what's cooking?</Txt></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        <Pressable onPress={() => go('/app/activity')} accessibilityLabel="Open activity and notifications" style={{ width: 38, height: 38, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}><Bell size={18} color={colors.forest700} />{unreadNotifications > 0 && <View style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: 5, backgroundColor: colors.accent500 }} />}</Pressable>
        <Pressable onPress={() => go('/app/profile')} accessibilityLabel="Open profile" style={{ backgroundColor: colors.forest700, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }}><Txt style={{ color: colors.cream, fontSize: 19, fontWeight: '700' }}>{firstName[0].toUpperCase()}</Txt></Pressable>
      </View>
    </View>
    <Pressable onPress={() => go('/app/discover')} style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 30, paddingVertical: 15 }]}><Search size={18} color={colors.charcoalMute} /><Txt style={{ color: colors.charcoalMute }}>Search recipes, ingredients, cuisines…</Txt></Pressable>
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Pressable onPress={() => go('/app/scanner')} style={{ flex: 1, backgroundColor: colors.forest700, borderRadius: 22, padding: 16, minHeight: 140 }}><Camera size={24} color={colors.accent300} /><Txt style={{ color: colors.cream, fontSize: 16, fontWeight: '700', marginTop: 12 }}>Scan My Fridge</Txt><Txt style={{ color: '#FAF8F2BB', fontSize: 11, lineHeight: 16, marginTop: 4 }}>Snap a photo — AI identifies your ingredients.</Txt></Pressable>
      <Pressable onPress={() => go('/app/voice')} style={{ flex: 1, backgroundColor: colors.white, borderRadius: 22, padding: 16, minHeight: 140 }}><Mic size={24} color={colors.accent500} /><Txt style={{ fontSize: 16, fontWeight: '700', marginTop: 12 }}>AI Kitchen Assistant</Txt><Txt style={{ color: colors.charcoalSoft, fontSize: 11, lineHeight: 16, marginTop: 4 }}>Talk or type — I'll cook up ideas and take actions.</Txt></Pressable>
    </View>
    {(expiring.length > 0 || expired.length > 0) && <Pressable onPress={() => go('/app/pantry')} style={[styles.card, { marginTop: 14, backgroundColor: colors.accent50, borderWidth: 1, borderColor: colors.accent100 }]}><Txt style={{ fontWeight: '700' }}>⚠ Use it or lose it</Txt><Txt style={{ color: colors.charcoalSoft, fontSize: 12, marginTop: 5 }}>{expired.length ? `${expired.length} item${expired.length === 1 ? '' : 's'} expired. ` : ''}{expiring.map((item) => item.name).slice(0, 3).join(', ')} {expiring.length > 0 ? 'expire soon.' : ''}</Txt></Pressable>}
    {recipes[0] && <View style={{ marginTop: 22 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}><SectionTitle>Today's recommendation</SectionTitle><Pressable onPress={() => go('/app/discover')}><Txt style={{ color: colors.forest700, fontSize: 12, fontWeight: '600' }}>Discover ›</Txt></Pressable></View><RecipeTile recipe={recipes[0]} onPress={() => go(`/app/recipe/${recipes[0].id}`)} onFavorite={() => { void setRecipeFavorite(recipes[0]).catch((error) => toast(error instanceof Error ? error.message : 'Could not update favorite.', 'error')); }} /></View>}
    {today && <View><SectionTitle>Today's meal plan</SectionTitle><View style={styles.card}><ScrollView horizontal showsHorizontalScrollIndicator={false}>{(['Breakfast', 'Lunch', 'Dinner'] as const).map((meal) => {
      const item = today.meals[meal];
      if (!item) return null;
      return <Pressable key={meal} onPress={() => go('/app/planner')} style={{ width: 145, marginRight: 10 }}><Image source={{ uri: item.image }} style={{ height: 100, borderRadius: 15 }} resizeMode="cover" /><Txt style={{ color: colors.accent600, fontSize: 10, fontWeight: '700', marginTop: 7 }}>{meal.toUpperCase()}</Txt><Txt numberOfLines={1} style={{ fontWeight: '600', fontSize: 12, marginTop: 3 }}>{item.title}</Txt><Txt style={{ color: colors.charcoalMute, fontSize: 10, marginTop: 3 }}>{item.cookingTime} min · {item.nutrition.calories} kcal</Txt></Pressable>;
    })}</ScrollView></View></View>}
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Pressable onPress={() => go('/app/pantry')} style={[styles.card, { flex: 1 }]}><Txt style={{ fontWeight: '700' }}>Pantry inventory</Txt><Txt style={{ fontSize: 25, color: colors.forest700, fontWeight: '700', marginVertical: 6 }}>{pantry.length}</Txt><Txt style={{ color: colors.charcoalSoft, fontSize: 11 }}>{expiring.length ? `${expiring.length} items need attention.` : 'All items fresh.'}</Txt></Pressable>
      <Pressable onPress={() => go('/app/grocery')} style={[styles.card, { flex: 1 }]}><Txt style={{ fontWeight: '700' }}>Shopping progress</Txt><Txt style={{ fontSize: 25, color: colors.accent500, fontWeight: '700', marginVertical: 6 }}>{progress}%</Txt><Txt style={{ color: colors.charcoalSoft, fontSize: 11 }}>{grocery ? `${grocery.items.filter((i) => !i.purchased).length} items left.` : 'No active list yet.'}</Txt></Pressable>
    </View>
    <Pressable onPress={() => go('/app/planner')} style={{ backgroundColor: colors.forest700, borderRadius: 22, padding: 18, marginBottom: 16 }}><Txt style={{ color: colors.cream, fontSize: 17, fontWeight: '700' }}>Weekly meal planner</Txt><Txt style={{ color: '#FAF8F2BB', fontSize: 12, marginTop: 5 }}>{mealPlan ? 'This week is planned. Review or regenerate meals.' : 'Let AI plan your whole week in seconds.'}</Txt></Pressable>
    {recipes.length > 1 && <><SectionTitle>Popular this week</SectionTitle>{recipes.slice(1, 4).map((recipe) => <RecipeTile key={recipe.id} recipe={recipe} onPress={() => go(`/app/recipe/${recipe.id}`)} onFavorite={() => { void setRecipeFavorite(recipe).catch((error) => toast(error instanceof Error ? error.message : 'Could not update favorite.', 'error')); }} />)}</>}
    {recent.length > 0 && <><SectionTitle>Recently viewed</SectionTitle><HorizontalChips>{recent.map((recipe) => <Pressable key={recipe.id} onPress={() => go(`/app/recipe/${recipe.id}`)} style={{ width: 110, marginRight: 10 }}><Image source={{ uri: recipe.image }} style={{ width: 110, height: 90, borderRadius: 15 }} /><Txt numberOfLines={2} style={{ fontSize: 11, marginTop: 5 }}>{recipe.title}</Txt></Pressable>)}</HorizontalChips></>}
  </Page>;
}

export function DiscoverScreen() {
  const router = useRouter();
  const toast = useToast();
  const recipes = useAppStore((s) => s.recipes);
  const [query, setQuery] = useState('');
  const [cuisine, setCuisine] = useState('All');
  const cuisinesList = useMemo(() => ['All', ...Array.from(new Set(recipes.map((recipe) => recipe.cuisine)))], [recipes]);
  const filtered = recipes.filter((recipe) => {
    const text = query.toLowerCase();
    return (cuisine === 'All' || recipe.cuisine === cuisine) && (!text || recipe.title.toLowerCase().includes(text) || recipe.description.toLowerCase().includes(text) || recipe.ingredients.some((item) => item.name.toLowerCase().includes(text)) || recipe.dietaryTags.some((tag) => tag.toLowerCase().includes(text)));
  });
  return <Page title="Discover" subtitle="Search your recipe library by dish, ingredient or diet.">
    <View style={[styles.card, { borderRadius: 28, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 10 }]}><Search size={18} color={colors.charcoalMute} /><TextInput value={query} onChangeText={setQuery} placeholder="Try 'paneer', 'high protein', 'soup'…" placeholderTextColor={colors.charcoalMute} style={{ flex: 1, color: colors.charcoal, minHeight: 42 }} /></View>
    <HorizontalChips>{cuisinesList.map((item) => <Pill key={item} label={item} active={cuisine === item} onPress={() => setCuisine(item)} />)}</HorizontalChips>
    {filtered.length === 0 ? <EmptyState title="No recipes found" message={recipes.length === 0 ? 'Load demo data from the welcome screen, or generate recipes in AI Kitchen.' : 'Try a different search or cuisine filter.'} action={recipes.length === 0 ? <PageButton label="Open AI Kitchen" onPress={() => router.push('/app/ai-kitchen')} /> : undefined} /> :
      filtered.map((recipe) => <RecipeTile key={recipe.id} recipe={recipe} onPress={() => router.push(`/app/recipe/${recipe.id}`)} onFavorite={() => { void setRecipeFavorite(recipe).catch((error) => toast(error instanceof Error ? error.message : 'Could not update favorite.', 'error')); }} />)}
  </Page>;
}

export function AiKitchenScreen() {
  const router = useRouter();
  const toast = useToast();
  const pantry = useAppStore((s) => s.pantry);
  const recipes = useAppStore((s) => s.recipes);
  const addRecipes = useAppStore((s) => s.addRecipes);
  const [filters, setFilters] = useState<RecipeFilters>({ ingredients: pantry.slice(0, 6).map((item) => item.name), cuisine: 'Any', dietaryPreference: 'Any', maxCookingTime: 45, difficulty: 'Any', budget: 25, servings: 2 });
  const [newIngredient, setNewIngredient] = useState('');
  const [generated, setGenerated] = useState<Recipe[]>([]);
  const [busy, setBusy] = useState(false);
  const generate = async () => {
    setBusy(true);
    try {
      const items = await generateRecipes(filters);
      addRecipes(items);
      setGenerated(items);
      useStoreState.setState({ lastGenerationFilters: filters });
      toast(`${items.length} recipes generated from your ingredients`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Recipe generation failed. Try again.', 'error');
    } finally { setBusy(false); }
  };
  return <Page title="AI Kitchen" subtitle="Turn what you have into dinner." right={<Badge label="ChefMate AI" />}>
    <Pressable onPress={() => router.push('/app/scanner')} style={{ backgroundColor: colors.forest700, borderRadius: 22, padding: 17, marginBottom: 10, flexDirection: 'row', gap: 12 }}><Camera color={colors.accent300} /><View><Txt style={{ color: colors.cream, fontWeight: '700' }}>Scan your fridge</Txt><Txt style={{ color: '#FAF8F2AA', fontSize: 12, marginTop: 3 }}>Auto-detect ingredients with a photo</Txt></View></Pressable>
    <Pressable onPress={() => router.push('/app/voice')} style={[styles.card, { flexDirection: 'row', gap: 12 }]}><Mic color={colors.accent500} /><View><Txt style={{ fontWeight: '700' }}>Ask the voice assistant</Txt><Txt style={{ color: colors.charcoalSoft, fontSize: 12, marginTop: 3 }}>"What can I cook with paneer and tomatoes?"</Txt></View></Pressable>
    <View style={styles.card}>
      <SectionTitle>Recipe generator</SectionTitle><Label>Available ingredients</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{filters.ingredients.map((item) => <Pressable key={item} onPress={() => setFilters({ ...filters, ingredients: filters.ingredients.filter((i) => i !== item) })} style={{ backgroundColor: colors.sage, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginBottom: 7, flexDirection: 'row', gap: 5 }}><Txt style={{ color: colors.forest700, fontSize: 12 }}>{item}</Txt><X size={12} color={colors.forest700} /></Pressable>)}</View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}><TextInput value={newIngredient} onChangeText={setNewIngredient} onSubmitEditing={() => {
        const value = newIngredient.trim();
        if (value && !filters.ingredients.includes(value)) setFilters({ ...filters, ingredients: [...filters.ingredients, value] });
        setNewIngredient('');
      }} placeholder="e.g. paneer, tomatoes, spinach" style={[styles.input, { flex: 1 }]} /><Button onPress={() => {
        const value = newIngredient.trim();
        if (value && !filters.ingredients.includes(value)) setFilters({ ...filters, ingredients: [...filters.ingredients, value] });
        setNewIngredient('');
      }}><ButtonText>Add</ButtonText></Button></View>
      <MiniSelect label="Cuisine" value={filters.cuisine} options={['Any', ...cuisines]} onChange={(value) => setFilters({ ...filters, cuisine: value })} />
      <MiniSelect label="Dietary preference" value={filters.dietaryPreference} options={aiDiets} onChange={(value) => setFilters({ ...filters, dietaryPreference: value })} />
      <MiniSelect label="Difficulty" value={filters.difficulty} options={['Any', 'Easy', 'Medium', 'Hard']} onChange={(value) => setFilters({ ...filters, difficulty: value })} />
      <MiniSelect label="Max cooking time" value={`${filters.maxCookingTime} min`} options={[15, 30, 45, 60].map((time) => `${time} min`)} onChange={(value) => setFilters({ ...filters, maxCookingTime: parseInt(value, 10) })} />
      <View style={{ flexDirection: 'row', gap: 12, marginVertical: 6 }}>
        <View style={{ flex: 1 }}><Label>Servings · {filters.servings}</Label><View style={{ flexDirection: 'row', gap: 6 }}><Button secondary onPress={() => setFilters({ ...filters, servings: Math.max(1, filters.servings - 1) })}><ButtonText color={colors.forest700}>−</ButtonText></Button><Button secondary onPress={() => setFilters({ ...filters, servings: Math.min(8, filters.servings + 1) })}><ButtonText color={colors.forest700}>+</ButtonText></Button></View></View>
        <View style={{ flex: 1 }}><Label>Budget · ${filters.budget}</Label><View style={{ flexDirection: 'row', gap: 6 }}><Button secondary onPress={() => setFilters({ ...filters, budget: Math.max(5, filters.budget - 5) })}><ButtonText color={colors.forest700}>−</ButtonText></Button><Button secondary onPress={() => setFilters({ ...filters, budget: Math.min(100, filters.budget + 5) })}><ButtonText color={colors.forest700}>+</ButtonText></Button></View></View>
      </View>
      <View style={{ marginTop: 16 }}><Button onPress={generate} disabled={busy}>{busy ? <ActivityIndicator color={colors.cream} /> : <Wand2 size={18} color={colors.cream} />}<ButtonText>{busy ? 'ChefMate is thinking…' : generated.length ? 'Regenerate recipes' : 'Generate recipes'}</ButtonText></Button></View>
    </View>
    {busy && <View style={styles.card}><ActivityIndicator color={colors.forest700} /><Txt style={{ textAlign: 'center', marginTop: 8 }}>Generating recipes…</Txt></View>}
    {(generated.length ? generated : recipes.slice(0, 6)).map((recipe) => <View key={recipe.id}><RecipeTile recipe={recipe} onPress={() => router.push(`/app/recipe/${recipe.id}`)} onFavorite={() => { void setRecipeFavorite(recipe).catch((error) => toast(error instanceof Error ? error.message : 'Could not update favorite.', 'error')); }} />{generated.length > 0 && <Button secondary onPress={() => router.push(`/app/recipe/${recipe.id}`)} style={{ marginBottom: 14 }}><ButtonText color={colors.forest700}>Start cooking</ButtonText></Button>}</View>)}
    {!recipes.length && !busy && <EmptyState title="No recipes yet" message="Add your ingredients above and generate your first AI recipes, or scan your fridge to get started." />}
  </Page>;
}

export function FridgeScannerScreen() {
  const toast = useToast();
  const router = useRouter();
  const setScan = useAppStore((s) => s.setFridgeScan);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [results, setResults] = useState<ScannedIngredient[]>([]);
  const [phase, setPhase] = useState<'upload' | 'scanning' | 'results'>('upload');
  const [manualName, setManualName] = useState('');
  const [progress, setProgress] = useState(0);
  const chooseImage = async (camera: boolean) => {
    const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast(camera ? 'Camera permission is needed to take a fridge photo' : 'Photo library permission is needed to choose an image', 'error');
      return;
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    setImageUri(asset.uri);
    setPhase('scanning');
    setProgress(10);
    const timer = setInterval(() => setProgress((value) => Math.min(90, value + 11)), 300);
    try {
      const items = await scanFridgeImage(asset.uri);
      clearInterval(timer);
      setProgress(100);
      setResults(items);
      setPhase('results');
    } catch (error) {
      clearInterval(timer);
      setPhase('upload');
      toast(error instanceof Error ? error.message : 'The scan failed. Please try again.', 'error');
    }
  };
  const update = (id: string, patch: Partial<ScannedIngredient>) => setResults((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const save = async () => {
    const selected = results.filter((item) => item.selected);
    if (!selected.length) { toast('Select at least one ingredient to save', 'error'); return; }
    try {
      await confirmScannedIngredients(selected);
      setScan(selected);
      toast(`${selected.length} ingredients saved to your pantry`);
      router.replace('/app/ai-kitchen');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save scanned ingredients.', 'error');
    }
  };
  return <Page><HeaderBack /><View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}><View style={{ flex: 1 }}><Txt style={styles.title}>Scan My Fridge</Txt><Txt style={styles.subtitle}>Photograph your fridge and AI identifies the ingredients.</Txt></View><Badge label="AI vision" /></View>
    {phase === 'upload' && <>
      <Button onPress={() => chooseImage(true)} style={{ paddingVertical: 26, borderRadius: 24, marginBottom: 12 }}><Camera color={colors.accent300} /><View><ButtonText>Open camera</ButtonText><Txt style={{ color: '#FAF8F2AA', fontSize: 11, marginTop: 4 }}>Take a photo of your open fridge</Txt></View></Button>
      <Button secondary onPress={() => chooseImage(false)} style={{ borderStyle: 'dashed', borderWidth: 2, paddingVertical: 24 }}><ImageIcon color={colors.forest600} /><View><ButtonText color={colors.charcoal}>Upload an image</ButtonText><Txt style={{ color: colors.charcoalSoft, fontSize: 11, marginTop: 4 }}>JPG or PNG, up to 10MB</Txt></View></Button>
      <Txt style={{ textAlign: 'center', color: colors.charcoalMute, fontSize: 11, lineHeight: 17, marginTop: 16, backgroundColor: colors.sage, padding: 12, borderRadius: 14 }}>Choose a fridge photo and ChefMate will identify its ingredients.</Txt>
    </>}
    {phase === 'scanning' && <View style={styles.card}>{imageUri && <Image source={{ uri: imageUri }} style={{ height: 210, borderRadius: 16, marginBottom: 16 }} resizeMode="cover" />}<ActivityIndicator color={colors.forest700} /><Txt style={{ marginTop: 12, fontWeight: '600' }}>Uploading to AI vision service… {progress}%</Txt></View>}
    {phase === 'results' && <>
      {imageUri && <Image source={{ uri: imageUri }} style={{ height: 150, borderRadius: 18, marginBottom: 12 }} resizeMode="cover" />}
      <SectionTitle>Recognized ingredients ({results.filter((item) => item.selected).length} selected)</SectionTitle>
      {results.map((item) => <View key={item.id} style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11 }]}>
        <Pressable onPress={() => update(item.id, { selected: !item.selected })} style={{ width: 25, height: 25, borderRadius: 13, backgroundColor: item.selected ? colors.forest700 : colors.white, borderWidth: 2, borderColor: item.selected ? colors.forest700 : colors.forest200, alignItems: 'center', justifyContent: 'center' }}>{item.selected && <Check size={14} color={colors.cream} />}</Pressable>
        <View style={{ flex: 1, gap: 5 }}>
          <TextInput value={item.name} onChangeText={(name) => update(item.id, { name })} style={{ fontWeight: '600', color: colors.charcoal, padding: 2, fontSize: 13 }} />
          <Txt style={{ color: colors.charcoalMute, fontSize: 10 }}>Confidence {Math.round(item.confidence * 100)}%</Txt>
        </View>
        <TextInput value={String(item.quantity)} onChangeText={(value) => update(item.id, { quantity: Number(value) || 0 })} keyboardType="decimal-pad" style={[styles.input, { width: 64, padding: 8 }]} />
        <TextInput value={item.unit} onChangeText={(unit) => update(item.id, { unit: unit as Unit })} style={[styles.input, { width: 54, padding: 8 }]} />
        <Pressable onPress={() => setResults((items) => items.filter((entry) => entry.id !== item.id))}><Trash2 size={16} color={colors.charcoalMute} /></Pressable>
      </View>)}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}><Field value={manualName} onChangeText={setManualName} placeholder="Add an ingredient manually…" containerStyle={{ flex: 1 }} /><Button onPress={() => { if (!manualName.trim()) return; setResults((items) => [...items, { id: uid('scan'), name: manualName.trim(), quantity: 1, unit: 'pcs', confidence: 1, selected: true }]); setManualName(''); }}><Plus size={18} color={colors.cream} /></Button></View>
      <Button secondary onPress={() => setPhase('upload')} style={{ marginBottom: 10 }}><ButtonText color={colors.forest700}>Rescan</ButtonText></Button>
      <PageButton label="Save to pantry & generate recipes" onPress={save} icon={<Check size={17} color={colors.cream} />} />
      <Pressable onPress={() => router.replace('/app/ai-kitchen')} style={{ marginTop: 14, alignItems: 'center' }}><Txt style={{ color: colors.accent600, fontWeight: '700' }}>Generate recipes now</Txt></Pressable>
    </>}
  </Page>;
}

export function PantryScreen() {
  const router = useRouter();
  const toast = useToast();
  const pantry = useAppStore((s) => s.pantry);
  const recipes = useAppStore((s) => s.recipes);
  const [filter, setFilter] = useState<'all' | 'expiring' | Category>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: '1', unit: 'pcs' as Unit, expiryDate: '' });
  const soon = pantry.filter((item) => item.expiryDate && daysUntil(item.expiryDate) >= 0 && daysUntil(item.expiryDate) <= 3);
  const expired = pantry.filter((item) => item.expiryDate && daysUntil(item.expiryDate) < 0);
  const atRisk = [...expired, ...soon];
  const visible = filter === 'all' ? pantry : filter === 'expiring' ? atRisk : pantry.filter((item) => item.category === filter);
  const suggestions = recipes.filter((recipe) => recipe.ingredients.some((ingredient) => soon.some((item) => item.name.toLowerCase() === ingredient.name.toLowerCase()))).slice(0, 3);
  const runExpiry = async () => {
    try {
      await runBackendExpiryCheck();
      toast('Expiry check complete.', 'info');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The expiry check failed.', 'error');
    }
  };
  const addItem = async () => {
    if (!newItem.name.trim()) return;
    try {
      await addPantryItem({
        name: newItem.name.trim(),
        quantity: Number(newItem.quantity) || 1,
        unit: newItem.unit,
        category: categoryFor(newItem.name),
        expiryDate: newItem.expiryDate || undefined,
      });
      toast(`${newItem.name} added to pantry`);
      setNewItem({ name: '', quantity: '1', unit: 'pcs', expiryDate: '' });
      setShowAdd(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not add pantry item.', 'error');
    }
  };
  return <Page title="Pantry & Expiry" subtitle={`${pantry.length} items tracked · smart expiry monitoring on`} right={<Badge label="Expiry monitoring" />}>
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
      {[['Inventory fresh', `${pantry.length ? Math.round((pantry.length - atRisk.length) / pantry.length * 100) : 100}%`, colors.forest700], ['Items at risk', `${atRisk.length}`, colors.accent500], ['Expired value', `$${expired.reduce((total, item) => total + estimatePrice(item), 0).toFixed(2)}`, colors.red]].map(([label, value, color]) =>
        <View key={String(label)} style={[styles.card, { flex: 1, padding: 10, alignItems: 'center' }]}><Txt style={{ color: String(color), fontSize: 20, fontWeight: '700' }}>{value}</Txt><Txt style={{ color: colors.charcoalMute, fontSize: 9, textAlign: 'center', marginTop: 4 }}>{label}</Txt></View>)}
    </View>
    <View style={{ backgroundColor: colors.forest700, borderRadius: 22, padding: 17, marginBottom: 15 }}>
      <Txt style={{ color: colors.cream, fontWeight: '700', fontSize: 16 }}>Expiry automation</Txt>
      <Txt style={{ color: '#FAF8F2BB', fontSize: 12, lineHeight: 18, marginTop: 6 }}>A nightly job checks every item and generates recipe ideas for near-expiry ingredients.</Txt>
      <Pressable onPress={runExpiry} style={{ marginTop: 12, alignSelf: 'flex-start', backgroundColor: colors.cream, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9 }}><Txt style={{ color: colors.forest700, fontSize: 12, fontWeight: '700' }}>✦ Run expiry check now</Txt></Pressable>
    </View>
    {suggestions.length > 0 && <View style={[styles.card, { backgroundColor: colors.accent50 }]}><SectionTitle>Use it up: recipe ideas</SectionTitle><Txt style={{ color: colors.charcoalSoft, fontSize: 12, marginBottom: 10 }}>Made with {soon.map((item) => item.name).join(', ')}</Txt>{suggestions.map((recipe) => <Txt key={recipe.id} style={{ color: colors.forest700, marginBottom: 7 }}>{recipe.title} ›</Txt>)}</View>}
    {expired.length > 0 && <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 14, marginBottom: 12 }}><Txt style={{ color: colors.red, fontSize: 12, fontWeight: '600' }}>{expired.length} item{expired.length > 1 ? 's' : ''} expired: {expired.map((item) => item.name).join(', ')}</Txt></View>}
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
      <Button onPress={() => setShowAdd(!showAdd)}><Plus color={colors.cream} size={15} /><ButtonText>Add item</ButtonText></Button>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: 8 }}>{[['all', `All (${pantry.length})`], ['expiring', `Expiring (${atRisk.length})`], ...CATEGORIES.map((item) => [item, item])].map(([key, label]) => <Pill key={key} label={label} active={filter === key} onPress={() => setFilter(key as typeof filter)} />)}</ScrollView>
    </View>
    {showAdd && <View style={styles.card}>
      <Field label="Name" value={newItem.name} onChangeText={(name) => setNewItem({ ...newItem, name })} placeholder="Ingredient name" />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <Field label="Quantity" value={newItem.quantity} onChangeText={(quantity) => setNewItem({ ...newItem, quantity })} keyboardType="decimal-pad" containerStyle={{ flex: 1 }} />
        <View style={{ flex: 1 }}><Label>Unit</Label><ScrollView horizontal>{(['pcs', 'g', 'kg', 'ml', 'L', 'pack'] as Unit[]).map((unit) => <Pill key={unit} label={unit} active={newItem.unit === unit} onPress={() => setNewItem({ ...newItem, unit })} />)}</ScrollView></View>
      </View>
      <Field label="Expiry date (YYYY-MM-DD)" value={newItem.expiryDate} onChangeText={(expiryDate) => setNewItem({ ...newItem, expiryDate })} placeholder="2026-12-31" containerStyle={{ marginTop: 10 }} />
      <View style={{ flexDirection: 'row', gap: 9, marginTop: 12 }}><Button secondary onPress={() => setShowAdd(false)} style={{ flex: 1 }}><ButtonText color={colors.forest700}>Cancel</ButtonText></Button><Button onPress={addItem} style={{ flex: 1 }}><ButtonText>Add</ButtonText></Button></View>
    </View>}
    {visible.length === 0 ? <EmptyState title={pantry.length ? 'Nothing here' : 'Your pantry is empty'} message={pantry.length ? 'Try a different filter.' : 'Scan your fridge or add items manually to start tracking inventory and expiry dates.'} action={<PageButton label="Scan my fridge" onPress={() => router.push('/app/scanner')} />} /> : visible.map((item) => <PantryRow key={item.id} item={item} />)}
    <Txt style={{ color: colors.charcoalMute, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 20 }}>Expiry checks monitor items and run automatically.</Txt>
  </Page>;
}

function PantryRow({ item }: { item: PantryItem }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const days = item.expiryDate ? daysUntil(item.expiryDate) : null;
  const expiry = days === null ? '' : days < 0 ? `Expired ${formatDate(item.expiryDate!)}` : days === 0 ? 'Expires today' : `Expires ${formatDate(item.expiryDate!)}`;
  const update = async () => {
    try {
      await updatePantryItem({ ...item, quantity: Number(quantity) || 0 });
      setEditing(false);
      toast(`${item.name} updated`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update pantry item.', 'error');
    }
  };
  const remove = async () => {
    try {
      await deletePantryItem(item.id);
      toast(`${item.name} removed`, 'info');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not remove pantry item.', 'error');
    }
  };
  return <View style={[styles.card, { padding: 13, marginBottom: 9 }]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {editing ? <><TextInput value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" style={[styles.input, { width: 82, padding: 8 }]} /><Txt style={{ color: colors.charcoalMute }}>{item.unit}</Txt><Button onPress={update} style={{ marginLeft: 'auto', minHeight: 38, paddingVertical: 8 }}><ButtonText>Save</ButtonText></Button></> :
        <><View style={{ flex: 1 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}><Txt style={{ fontWeight: '700' }}>{item.name}</Txt><Pill label={item.category} /></View><Txt style={{ color: colors.charcoalMute, fontSize: 11, marginTop: 5 }}>{item.quantity} {item.unit}{expiry ? `  ·  ${expiry}` : ''}</Txt></View><Pressable onPress={() => setEditing(true)} style={{ padding: 7 }}><Txt style={{ color: colors.forest700, fontSize: 12, fontWeight: '600' }}>Edit</Txt></Pressable><Pressable onPress={() => void remove()} style={{ padding: 7 }}><X size={17} color={colors.charcoalMute} /></Pressable></>}
    </View>
  </View>;
}

export function GroceryScreen() {
  const toast = useToast();
  const grocery = useAppStore((s) => s.groceryList);
  const recipes = useAppStore((s) => s.recipes);
  const [showAdd, setShowAdd] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | Category>('all');
  const [newItem, setNewItem] = useState({ name: '', quantity: '1', unit: 'pcs' as Unit });
  const [filterOpen, setFilterOpen] = useState(false);
  const items = grocery?.items ?? [];
  const purchased = items.filter((item) => item.purchased);
  const total = items.reduce((sum, item) => sum + item.estimatedPrice, 0);
  const remaining = items.filter((item) => !item.purchased).reduce((sum, item) => sum + item.estimatedPrice, 0);
  const visible = items.filter((item) => filter === 'all' || item.category === filter);
  const updateItem = async (id: string, patch: { quantity?: number; purchased?: boolean }) => {
    try {
      await updateGroceryItem(id, patch);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update grocery item.', 'error');
    }
  };
  const clearPurchased = async () => {
    try {
      for (const item of purchased) await removeGroceryItem(item.id);
      setClearOpen(false);
      toast('Purchased items cleared', 'info');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not clear purchased items.', 'error');
    }
  };
  const removeItem = async (id: string, name: string) => {
    try {
      await removeGroceryItem(id);
      toast(`${name} removed`, 'info');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not remove grocery item.', 'error');
    }
  };
  const addItem = async () => {
    if (!newItem.name.trim()) return;
    const item = { name: newItem.name.trim(), quantity: Number(newItem.quantity) || 1, unit: newItem.unit, category: categoryFor(newItem.name), estimatedPrice: estimatePrice({ name: newItem.name, quantity: Number(newItem.quantity) || 1, unit: newItem.unit }), purchased: false };
    try {
      await addGroceryItemsToBackend([item]);
      setNewItem({ name: '', quantity: '1', unit: 'pcs' });
      setShowAdd(false);
      toast(`${item.name} added to list`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not add grocery item.', 'error');
    }
  };
  const generateFromFavorite = async () => {
    const recipe = recipes.find((item) => item.isFavorite) ?? recipes[0];
    if (!recipe) { toast('No recipes available yet — generate some in AI Kitchen first', 'info'); return; }
    try {
      await generateGroceryForRecipe(recipe);
      toast(`Shopping list generated for ${recipe.title}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not generate the grocery list.', 'error');
    }
  };
  return <Page title="Grocery Manager" subtitle={grocery?.generatedFrom ?? 'Your smart shopping lists, built from recipes and meal plans.'} right={<Badge label="Pantry-aware" />}>
    <View style={{ backgroundColor: colors.forest700, borderRadius: 23, padding: 17, marginBottom: 16 }}>
      <Txt style={{ color: colors.cream, fontWeight: '700', fontSize: 16 }}>Smart list generation</Txt>
      <Txt style={{ color: '#FAF8F2BB', lineHeight: 18, fontSize: 12, marginTop: 5 }}>ChefMate compares each recipe against your pantry — only ingredients you are missing go on the list.</Txt>
      <Pressable onPress={generateFromFavorite} style={{ alignSelf: 'flex-start', marginTop: 11, backgroundColor: colors.cream, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 17 }}><Txt style={{ color: colors.forest700, fontSize: 11, fontWeight: '700' }}>🛒 Build list from a recipe</Txt></Pressable>
    </View>
    {items.length > 0 && <>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 }}><Txt style={{ fontWeight: '600' }}>Shopping progress</Txt><Txt style={{ color: colors.forest700, fontSize: 18, fontWeight: '700' }}>{Math.round(purchased.length / items.length * 100)}%</Txt></View>
        <View style={{ height: 8, backgroundColor: colors.cream100, borderRadius: 6 }}><View style={{ width: `${purchased.length / items.length * 100}%`, height: 8, backgroundColor: colors.forest600, borderRadius: 6 }} /></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}><Txt style={{ color: colors.charcoalMute, fontSize: 11 }}>{purchased.length} of {items.length} items</Txt><Txt style={{ color: colors.charcoalMute, fontSize: 11 }}>${remaining.toFixed(2)} left of ${total.toFixed(2)}</Txt></View>
      </View>
    </>}
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
      <Button onPress={() => setShowAdd(!showAdd)}><Plus size={16} color={colors.cream} /><ButtonText>Add item</ButtonText></Button>
      {purchased.length > 0 && <Button secondary onPress={() => setClearOpen(true)}><ButtonText color={colors.charcoalSoft}>Clear purchased</ButtonText></Button>}
      <Pressable onPress={() => setFilterOpen(!filterOpen)} style={{ paddingHorizontal: 10, justifyContent: 'center' }}><Txt style={{ color: colors.forest700, fontSize: 12 }}>{filter === 'all' ? 'All categories' : filter} ▾</Txt></Pressable>
    </View>
    {filterOpen && <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}><Pill label="All" active={filter === 'all'} onPress={() => { setFilter('all'); setFilterOpen(false); }} />{CATEGORIES.map((category) => <Pill key={category} label={category} active={filter === category} onPress={() => { setFilter(category); setFilterOpen(false); }} />)}</View>}
    {showAdd && <View style={styles.card}>
      <Field label="Item name" value={newItem.name} onChangeText={(name) => setNewItem({ ...newItem, name })} placeholder="Item name" />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <Field label="Quantity" value={newItem.quantity} onChangeText={(quantity) => setNewItem({ ...newItem, quantity })} keyboardType="decimal-pad" containerStyle={{ flex: 1 }} />
        <View style={{ flex: 1 }}><Label>Unit</Label><ScrollView horizontal>{(['pcs', 'g', 'kg', 'ml', 'L', 'pack'] as Unit[]).map((unit) => <Pill key={unit} label={unit} active={newItem.unit === unit} onPress={() => setNewItem({ ...newItem, unit })} />)}</ScrollView></View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}><Button secondary onPress={() => setShowAdd(false)} style={{ flex: 1 }}><ButtonText color={colors.forest700}>Cancel</ButtonText></Button><Button onPress={addItem} style={{ flex: 1 }}><ButtonText>Add</ButtonText></Button></View>
    </View>}
    {!items.length ? <EmptyState title="No shopping list yet" message="Generate one from a recipe or a weekly meal plan, or add items manually." action={<Button onPress={() => setShowAdd(true)}><Plus color={colors.cream} size={15} /><ButtonText>Add item manually</ButtonText></Button>} /> : visible.map((item) => <View key={item.id} style={[styles.card, { flexDirection: 'row', alignItems: 'center', padding: 12, opacity: item.purchased ? 0.6 : 1 }]}>
      <Pressable onPress={() => void updateItem(item.id, { purchased: !item.purchased })} style={{ marginRight: 9 }}>{item.purchased ? <View style={{ backgroundColor: colors.forest700, width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}><Check size={14} color={colors.cream} /></View> : <Circle size={23} color={colors.forest200} />}</Pressable>
      <View style={{ flex: 1 }}><Txt style={{ textDecorationLine: item.purchased ? 'line-through' : 'none' }}>{item.name}</Txt><Txt style={{ fontSize: 10, color: colors.charcoalMute, marginTop: 3 }}>{item.category} · ${item.estimatedPrice.toFixed(2)}</Txt></View>
      <View style={{ alignItems: 'center' }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Pressable onPress={() => void updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}><Txt style={{ color: colors.forest700, fontWeight: '700', fontSize: 17 }}>−</Txt></Pressable><Txt style={{ fontSize: 11 }}>{item.quantity} {item.unit}</Txt><Pressable onPress={() => void updateItem(item.id, { quantity: item.quantity + 1 })}><Txt style={{ color: colors.forest700, fontWeight: '700', fontSize: 17 }}>+</Txt></Pressable></View></View>
      <Pressable onPress={() => void removeItem(item.id, item.name)} style={{ padding: 7 }}><Trash2 size={15} color={colors.charcoalMute} /></Pressable>
    </View>)}
    <ConfirmModal visible={clearOpen} title="Clear purchased items?" message="This removes all ticked items from your shopping list. This cannot be undone." onCancel={() => setClearOpen(false)} onConfirm={() => void clearPurchased()} destructive />
    <Txt style={{ color: colors.charcoalMute, fontSize: 11, textAlign: 'center', lineHeight: 17, marginTop: 16 }}>Shopping lists sync with your ChefMate account.</Txt>
  </Page>;
}

export function PlannerScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAppStore((s) => s.user);
  const plan = useAppStore((s) => s.mealPlan);
  const [input, setInput] = useState<MealPlannerInput>({ budget: user?.weeklyBudget ?? 85, dietaryPreference: user?.dietaryPreference ?? 'Vegetarian (with eggs)', householdSize: user?.householdSize ?? 3, availableIngredients: '', nutritionPreference: user?.nutritionPreference ?? 'High protein' });
  const [busy, setBusy] = useState(false);
  const [busyDay, setBusyDay] = useState<number | null>(null);
  const [busyMeal, setBusyMeal] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dietOpen, setDietOpen] = useState(false);
  const calories = plan ? Math.round(plan.days.reduce((total, day) => total + Object.values(day.meals).reduce((sum, meal) => sum + (meal?.nutrition.calories ?? 0), 0), 0) / Math.max(1, plan.days.length)) : 0;
  const generate = async () => {
    setBusy(true);
    try {
      const next = await generateMealPlan(input);
      useAppStore.getState().setMealPlan(next);
      useStoreState.setState({ lastPlannerInput: input });
      setExpanded(next.days[0]?.day ?? null);
      toast('Your weekly meal plan is ready');
    } catch (error) { toast(error instanceof Error ? error.message : 'Meal plan generation failed. Try again.', 'error'); }
    finally { setBusy(false); }
  };
  const makeGrocery = async () => {
    if (!plan) return;
    try {
      const result = await groceryListFromPlan(plan);
      toast(`${result.count} items added to your grocery list`);
      router.push('/app/grocery');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not generate the grocery list.', 'error');
    }
  };
  const swapDay = async (index: number) => {
    if (!plan) return;
    setBusyDay(index);
    try { useAppStore.getState().setMealPlan(await regenerateDay(plan, index)); toast(`${plan.days[index].day} regenerated`); }
    catch (error) { toast(error instanceof Error ? error.message : 'Could not regenerate this day. Try again.', 'error'); }
    finally { setBusyDay(null); }
  };
  const swapMeal = async (index: number, meal: MealType) => {
    if (!plan) return;
    setBusyMeal(`${index}-${meal}`);
    try { useAppStore.getState().setMealPlan(await replaceMeal(plan, index, meal)); toast('Meal replaced'); }
    catch (error) { toast(error instanceof Error ? error.message : 'Could not replace the meal. Try again.', 'error'); }
    finally { setBusyMeal(null); }
  };
  const viewMeal = (day: string, mealType: MealType, item: MealSlot) => {
    const recipe = useAppStore.getState().recipes.find((candidate) =>
      (item.recipeId && candidate.id === item.recipeId) ||
      candidate.title.trim().toLowerCase() === item.title.trim().toLowerCase());
    if (recipe) {
      router.push(`/app/recipe/${encodeURIComponent(recipe.id)}`);
      return;
    }
    router.push(`/app/recipe/planned?day=${encodeURIComponent(day)}&meal=${encodeURIComponent(mealType)}&title=${encodeURIComponent(item.title)}` as never);
  };
  return <Page title="Weekly Meal Planner" subtitle="Seven days, three meals, one budget — planned by AI." right={<Badge label="AI planner" />}>
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><Label>Weekly budget · ${input.budget}</Label><View style={{ flexDirection: 'row', gap: 6 }}><Button secondary onPress={() => setInput({ ...input, budget: Math.max(20, input.budget - 5) })}><ButtonText color={colors.forest700}>−</ButtonText></Button><Button secondary onPress={() => setInput({ ...input, budget: Math.min(250, input.budget + 5) })}><ButtonText color={colors.forest700}>+</ButtonText></Button></View></View>
        <View style={{ flex: 1 }}><Label>Household · {input.householdSize}</Label><View style={{ flexDirection: 'row', gap: 6 }}><Button secondary onPress={() => setInput({ ...input, householdSize: Math.max(1, input.householdSize - 1) })}><ButtonText color={colors.forest700}>−</ButtonText></Button><Button secondary onPress={() => setInput({ ...input, householdSize: Math.min(8, input.householdSize + 1) })}><ButtonText color={colors.forest700}>+</ButtonText></Button></View></View>
      </View>
      <Pressable onPress={() => setDietOpen(!dietOpen)} style={{ marginTop: 16, padding: 12, borderRadius: 14, backgroundColor: colors.cream100, flexDirection: 'row', justifyContent: 'space-between' }}><Txt style={{ fontSize: 13 }}>{input.dietaryPreference}</Txt><ChevronDown size={16} color={colors.charcoalSoft} /></Pressable>
      {dietOpen && <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 7 }}>{['No restrictions', 'Vegetarian (with eggs)', 'Vegetarian', 'Vegan', 'Pescatarian', 'High protein', 'Low carb'].map((value) => <Pill key={value} label={value} active={value === input.dietaryPreference} onPress={() => { setInput({ ...input, dietaryPreference: value }); setDietOpen(false); }} />)}</View>}
      <View style={{ marginTop: 15 }}><Button onPress={generate} disabled={busy}>{busy ? <ActivityIndicator color={colors.cream} /> : <Wand2 size={17} color={colors.cream} />}<ButtonText>{busy ? 'Planning your week…' : plan ? 'Regenerate weekly plan' : 'Generate weekly plan'}</ButtonText></Button></View>
    </View>
    {busy && <View style={styles.card}><ActivityIndicator color={colors.forest700} /><Txt style={{ textAlign: 'center', marginTop: 8 }}>Planning your week…</Txt></View>}
    {plan && !busy && <>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>{[[`$${plan.budget}`, 'weekly budget'], [String(calories), 'avg kcal / day'], [String(plan.days.reduce((sum, day) => sum + Object.keys(day.meals).length, 0)), 'meals planned']].map(([value, label]) => <View key={label} style={[styles.card, { flex: 1, padding: 10, alignItems: 'center' }]}><Txt style={{ color: colors.forest700, fontSize: 18, fontWeight: '700' }}>{value}</Txt><Txt style={{ color: colors.charcoalMute, textAlign: 'center', fontSize: 9, marginTop: 4 }}>{label}</Txt></View>)}</View>
      <View style={{ marginBottom: 12 }}><PageButton label="Generate grocery list from this plan" onPress={makeGrocery} icon={<ShoppingCart size={17} color={colors.cream} />} /></View>
      {plan.days.map((day, index) => <View key={day.day} style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
        <Pressable onPress={() => setExpanded(expanded === day.day ? null : day.day)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><CalendarRange size={17} color={colors.forest700} /><Txt style={{ fontWeight: '700' }}>{day.day}</Txt></View><ChevronDown size={17} color={colors.charcoalMute} /></Pressable>
        {expanded === day.day && <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          {MEAL_TYPES.map((meal) => {
            const item = day.meals[meal];
            if (!item) return null;
            return <View key={meal} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cream, padding: 9, borderRadius: 15, marginBottom: 8 }}>
              <Image source={{ uri: item.image }} style={{ width: 58, height: 58, borderRadius: 12 }} />
              <View style={{ flex: 1, paddingHorizontal: 9 }}><Txt style={{ color: colors.accent600, fontSize: 9, fontWeight: '700' }}>{meal.toUpperCase()}</Txt><Txt numberOfLines={1} style={{ fontWeight: '600', fontSize: 12, marginTop: 3 }}>{item.title}</Txt><Txt style={{ color: colors.charcoalMute, fontSize: 9, marginTop: 3 }}>{item.cookingTime} min · {item.nutrition.calories} kcal</Txt></View>
              <View style={{ gap: 5 }}><Pressable onPress={() => viewMeal(day.day, meal, item)} style={{ padding: 5 }}><Txt style={{ color: colors.forest700, fontSize: 10 }}>View</Txt></Pressable><Pressable disabled={busyMeal === `${index}-${meal}`} onPress={() => swapMeal(index, meal)} style={{ padding: 5 }}><Txt style={{ color: colors.charcoalSoft, fontSize: 10 }}>{busyMeal === `${index}-${meal}` ? '…' : 'Swap'}</Txt></Pressable></View>
            </View>;
          })}
          <Button secondary onPress={() => swapDay(index)} disabled={busyDay === index}><ButtonText color={colors.forest700}>{busyDay === index ? 'Regenerating…' : 'Regenerate whole day'}</ButtonText></Button>
        </View>}
      </View>)}
      <Txt style={{ color: colors.charcoalMute, textAlign: 'center', fontSize: 11, marginTop: 5 }}>✓ Plan saved automatically to your account</Txt>
    </>}
    {!plan && !busy && <EmptyState title="No plan yet this week" message="Set your budget and preferences above, and ChefMate will plan breakfast, lunch, dinner and snacks for all seven days." />}
  </Page>;
}

function NutritionSummary({ nutrition, compact = false }: { nutrition: Recipe['nutrition']; compact?: boolean }) {
  const items = [
    ['Calories', nutrition.calories, 'kcal'],
    ['Protein', nutrition.protein, 'g'],
    ['Carbs', nutrition.carbs, 'g'],
    ['Fat', nutrition.fat, 'g'],
    ['Fiber', nutrition.fiber, 'g'],
  ];
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: compact ? 4 : 7 }}>
    {items.map(([label, amount, unit]) => <View key={String(label)} style={{ backgroundColor: colors.cream, borderRadius: 13, padding: 8, minWidth: compact ? 58 : '18%', flexGrow: 1, alignItems: 'center' }}>
      <Txt style={{ fontSize: 13, fontWeight: '700' }}>{amount}<Txt style={{ color: colors.charcoalMute, fontSize: 9, fontWeight: '400' }}>{unit}</Txt></Txt>
      <Txt style={{ color: colors.charcoalMute, fontSize: 9, marginTop: 2 }}>{label}</Txt>
    </View>)}
  </View>;
}

export function RecipeDetailsScreen() {
  const { id: paramId, day: plannedDayParam, meal: plannedMealParam, title: plannedTitleParam } = useLocalSearchParams<{ id: string; day?: string; meal?: string; title?: string }>();
  const id = Array.isArray(paramId) ? paramId[0] : paramId;
  const plannedDay = Array.isArray(plannedDayParam) ? plannedDayParam[0] : plannedDayParam;
  const plannedMealName = Array.isArray(plannedMealParam) ? plannedMealParam[0] : plannedMealParam;
  const plannedTitle = Array.isArray(plannedTitleParam) ? plannedTitleParam[0] : plannedTitleParam;
  const router = useRouter();
  const toast = useToast();
  const recipes = useAppStore((s) => s.recipes);
  const mealPlan = useAppStore((s) => s.mealPlan);
  const plannedMealType = MEAL_TYPES.find((type) => type.toLowerCase() === plannedMealName?.toLowerCase());
  const plannedSlot = plannedDay && plannedMealType
    ? mealPlan?.days.find((day) => day.day === plannedDay)?.meals[plannedMealType]
    : undefined;
  const recipe = recipes.find((item) => item.id === id) ?? (id === 'planned' && plannedTitle
    ? recipes.find((item) => item.title.trim().toLowerCase() === plannedTitle.trim().toLowerCase())
    : undefined);
  const pantry = useAppStore((s) => s.pantry);
  const [servings, setServings] = useState(recipe?.servings ?? 2);
  const [checked, setChecked] = useState<string[]>([]);
  const [modifyText, setModifyText] = useState('');
  const [modifying, setModifying] = useState(false);
  const [cookMode, setCookMode] = useState(false);
  const [step, setStep] = useState(0);
  const [cookingSessionId, setCookingSessionId] = useState<string | undefined>();
  const [seconds, setSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  useEffect(() => { if (recipe) useAppStore.getState().markViewed(recipe.id); }, [recipe?.id]);
  useEffect(() => {
    if (!timerRunning || seconds === null) return;
    const timer = setInterval(() => setSeconds((value) => {
      if (value === null || value <= 1) {
        setTimerRunning(false);
        toast('Timer done!', 'info');
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [timerRunning, seconds]);
  if (!recipe && plannedSlot) return <Page title={plannedSlot.title} subtitle={`${plannedDay} · ${plannedMealType}`}>
    <Image source={{ uri: plannedSlot.image }} style={{ height: 220, borderRadius: 20, marginBottom: 16 }} resizeMode="cover" />
    <View style={styles.card}>
      <SectionTitle>{plannedMealType} · {plannedDay}</SectionTitle>
      {plannedSlot.description ? <Txt style={{ color: colors.charcoalSoft, lineHeight: 20, marginBottom: 12 }}>{plannedSlot.description}</Txt> : null}
      {plannedSlot.cookingTime > 0 && <Txt style={{ color: colors.charcoalMute, fontSize: 12, marginBottom: 12 }}>About {plannedSlot.cookingTime} minutes</Txt>}
      {Object.values(plannedSlot.nutrition).some((value) => value > 0) && <NutritionSummary nutrition={plannedSlot.nutrition} />}
      <Txt style={{ color: colors.charcoalMute, fontSize: 11, lineHeight: 17, marginTop: 14 }}>This meal is part of your weekly plan. Full ingredients and cooking steps are not attached to this planned meal.</Txt>
    </View>
    <Button secondary onPress={() => router.push('/app/discover')}><ButtonText color={colors.forest700}>Browse recipes</ButtonText></Button>
    <Button secondary onPress={() => router.back()} style={{ marginTop: 8 }}><ButtonText color={colors.forest700}>Back to plan</ButtonText></Button>
  </Page>;
  if (!recipe) return <Page><EmptyState title="Recipe not found" message="This recipe is no longer available." action={<Button onPress={() => router.replace('/app/discover')}><ButtonText>Back to Discover</ButtonText></Button>} /></Page>;
  const missing = recipe.ingredients.filter((ingredient) => !pantry.some((item) => item.name.toLowerCase() === ingredient.name.toLowerCase() && item.quantity >= ingredient.quantity));
  const scale = servings / recipe.servings;
  const modify = async (value: string) => {
    if (!value.trim()) return;
    setModifying(true);
    try {
      const updated = await modifyRecipe(recipe, value);
      useAppStore.getState().updateRecipe({ ...updated, id: recipe.id });
      setModifyText('');
      toast('Recipe updated with your changes');
    } catch (error) { toast(error instanceof Error ? error.message : 'Could not update this recipe. Try again.', 'error'); }
    finally { setModifying(false); }
  };
  const addMissing = async () => {
    try {
      await generateGroceryForRecipe(recipe);
      toast(`Shopping list generated for ${recipe.title}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not generate the grocery list.', 'error');
    }
  };
  const beginCooking = async () => {
    try {
      const sessionId = await startCookingSession(recipe.id);
      setCookingSessionId(sessionId);
      setCookMode(true);
      setStep(0);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not start cooking mode.', 'error');
    }
  };
  const advanceCookingStep = async () => {
    try {
      await nextCookingStep();
      setStep((current) => Math.min(recipe.instructions.length - 1, current + 1));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not advance the cooking step.', 'error');
    }
  };
  const goBackCookingStep = async () => {
    const previousStep = Math.max(0, step - 1);
    try {
      if (cookingSessionId) await updateCookingSession(cookingSessionId, previousStep);
      setStep(previousStep);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update the cooking step.', 'error');
    }
  };
  const finishCooking = async () => {
    try {
      if (cookingSessionId) await updateCookingSession(cookingSessionId, step, 'completed');
      toast('Bon appétit! Recipe completed.');
      setCookMode(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not finish the cooking session.', 'error');
    }
  };
  if (cookMode) {
    const formatSeconds = (value: number) => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
    return <Page>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <Pressable onPress={() => setCookMode(false)} style={{ backgroundColor: colors.white, borderRadius: 22, padding: 10 }}><X size={18} color={colors.charcoal} /></Pressable>
        <Txt style={{ color: colors.charcoalSoft }}>Step {step + 1} of {recipe.instructions.length}</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => { setSeconds(600); setTimerRunning(true); }} style={{ backgroundColor: colors.white, borderRadius: 22, padding: 10 }}><Clock size={17} color={colors.forest700} /></Pressable>
          <Pressable onPress={() => setStep(0)} style={{ backgroundColor: colors.white, borderRadius: 22, padding: 10 }}><Txt style={{ color: colors.charcoalSoft }}>↺</Txt></Pressable>
        </View>
      </View>
      <View style={{ height: 6, backgroundColor: colors.forest100, borderRadius: 4, marginBottom: 25 }}><View style={{ height: 6, width: `${((step + 1) / recipe.instructions.length) * 100}%`, backgroundColor: colors.forest600, borderRadius: 4 }} /></View>
      {seconds !== null && <View style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}><View><Txt style={{ fontWeight: '600' }}>{timerRunning ? 'Cooking timer' : 'Timer paused'}</Txt><Txt style={{ color: colors.charcoalMute, fontSize: 11 }}>10 minute timer</Txt></View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Txt style={{ fontSize: 25, fontWeight: '700' }}>{formatSeconds(seconds)}</Txt><Pressable onPress={() => setTimerRunning(!timerRunning)}><Txt style={{ color: colors.forest700, fontSize: 18 }}>{timerRunning ? 'Ⅱ' : '▶'}</Txt></Pressable></View></View>}
      <Txt style={{ fontSize: 27, lineHeight: 37, fontWeight: '700', marginTop: 18, minHeight: 175 }}>{recipe.instructions[step]}</Txt>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
        <Button secondary disabled={step === 0} onPress={() => void goBackCookingStep()}><ButtonText color={colors.forest700}>‹ Back</ButtonText></Button>
        {step < recipe.instructions.length - 1 ? <Button onPress={() => void advanceCookingStep()} style={{ flex: 1 }}><ButtonText>Next step ›</ButtonText></Button> : <Button onPress={() => void finishCooking()} style={{ flex: 1, backgroundColor: colors.accent500 }}><Check size={17} color={colors.white} /><ButtonText>Finish</ButtonText></Button>}
      </View>
    </Page>;
  }
  return <Page>
    <HeaderBack />
    <View style={{ position: 'relative', marginBottom: 15 }}>
      <Image source={{ uri: recipe.image }} style={{ height: 230, borderRadius: 23 }} resizeMode="cover" />
      <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => { void setRecipeFavorite(recipe).catch((error) => toast(error instanceof Error ? error.message : 'Could not update favorite.', 'error')); }} style={{ backgroundColor: '#FFFFFFEE', borderRadius: 24, padding: 10 }}><Heart size={18} color={recipe.isFavorite ? colors.accent500 : colors.charcoalSoft} fill={recipe.isFavorite ? colors.accent500 : 'none'} /></Pressable>
        <Pressable onPress={() => Share.share({ title: recipe.title, message: `${recipe.title}\nchefmate://app/recipe/${recipe.id}` })} style={{ backgroundColor: '#FFFFFFEE', borderRadius: 24, padding: 10 }}><Txt>↗</Txt></Pressable>
      </View>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>{recipe.dietaryTags.map((tag) => <Pill key={tag} label={tag} />)}</View>
    <Txt style={{ fontSize: 25, fontWeight: '700' }}>{recipe.title}</Txt>
    <Txt style={{ color: colors.charcoalSoft, lineHeight: 21, marginTop: 7 }}>{recipe.description}</Txt>
    <View style={{ flexDirection: 'row', gap: 7, marginVertical: 16 }}>{[['Prep', `${recipe.prepTime}m`], ['Cook', `${recipe.cookingTime}m`], ['Serves', recipe.servings], ['Level', recipe.difficulty]].map(([label, value]) => <View key={String(label)} style={[styles.card, { flex: 1, padding: 9, alignItems: 'center' }]}><Txt style={{ fontSize: 13, fontWeight: '700' }}>{value}</Txt><Txt style={{ color: colors.charcoalMute, fontSize: 9, marginTop: 3 }}>{label}</Txt></View>)}</View>
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}><SectionTitle>Ingredients</SectionTitle><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Pressable onPress={() => setServings(Math.max(1, servings - 1))}><Txt style={{ color: colors.forest700, fontWeight: '700', fontSize: 18 }}>−</Txt></Pressable><Txt style={{ fontSize: 11 }}>{servings} servings</Txt><Pressable onPress={() => setServings(Math.min(12, servings + 1))}><Txt style={{ color: colors.forest700, fontWeight: '700', fontSize: 18 }}>+</Txt></Pressable></View></View>
      {recipe.ingredients.map((ingredient) => <Pressable key={ingredient.name} onPress={() => setChecked((items) => items.includes(ingredient.name) ? items.filter((name) => name !== ingredient.name) : [...items, ingredient.name])} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 9 }}>
        {checked.includes(ingredient.name) ? <Check size={16} color={colors.forest700} /> : <Circle size={16} color={colors.forest200} />}
        <Txt style={{ flex: 1, textDecorationLine: checked.includes(ingredient.name) ? 'line-through' : 'none', color: checked.includes(ingredient.name) ? colors.charcoalMute : colors.charcoal }}>{ingredient.name}</Txt>
        <Txt style={{ color: colors.charcoalMute, fontSize: 11 }}>{Math.round(ingredient.quantity * scale * 10) / 10} {ingredient.unit}</Txt>
        {missing.some((item) => item.name.toLowerCase() === ingredient.name.toLowerCase()) && <Txt style={{ color: colors.accent600, fontSize: 9, fontWeight: '700' }}>MISSING</Txt>}
      </Pressable>)}
      {missing.length > 0 && <View style={{ marginTop: 8 }}><Button onPress={addMissing} style={{ backgroundColor: colors.accent500 }}><ShoppingCart size={15} color={colors.white} /><ButtonText>Add {missing.length} missing ingredients to grocery list</ButtonText></Button></View>}
    </View>
    <View style={styles.card}><View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}><SectionTitle>Nutrition</SectionTitle><Pressable onPress={() => router.push(`/app/nutrition?recipeId=${encodeURIComponent(recipe.id)}`)}><Txt style={{ color: colors.forest700, fontSize: 11, fontWeight: '700' }}>Analyze</Txt></Pressable></View><NutritionSummary nutrition={recipe.nutrition} /><Txt style={{ color: colors.charcoalMute, fontSize: 10, marginTop: 10 }}>AI-generated estimate — not medical advice.</Txt></View>
    <View style={styles.card}><SectionTitle>Instructions</SectionTitle>{recipe.instructions.map((instruction, index) => <View key={index} style={{ flexDirection: 'row', gap: 10, marginBottom: 13 }}><View style={{ width: 26, height: 26, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest700 }}><Txt style={{ color: colors.cream, fontSize: 11, fontWeight: '700' }}>{index + 1}</Txt></View><Txt style={{ flex: 1, color: colors.charcoalSoft, lineHeight: 20 }}>{instruction}</Txt></View>)}</View>
    <View style={{ backgroundColor: colors.forest700, padding: 17, borderRadius: 22, marginBottom: 12 }}>
      <Txt style={{ color: colors.cream, fontSize: 17, fontWeight: '700', marginBottom: 11 }}>✦ Ask AI about this recipe</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{['Make it vegetarian', 'Make it dairy-free', 'Reduce the spice', 'Make it cheaper', 'Replace butter with oil'].map((value) => <Pressable key={value} onPress={() => setModifyText(value)} style={{ backgroundColor: colors.forest600, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, marginRight: 6, marginBottom: 6 }}><Txt style={{ color: colors.cream, fontSize: 10 }}>{value}</Txt></Pressable>)}</View>
      <View style={{ flexDirection: 'row', gap: 7, marginTop: 7 }}><TextInput value={modifyText} onChangeText={setModifyText} placeholder="e.g. make it gluten-free" placeholderTextColor="#FAF8F266" style={{ flex: 1, color: colors.cream, backgroundColor: colors.forest600, borderRadius: 14, paddingHorizontal: 12 }} /><Button onPress={() => modify(modifyText)} disabled={modifying} style={{ backgroundColor: colors.accent500 }}><ButtonText>{modifying ? '…' : 'Apply'}</ButtonText></Button></View>
      <Badge label="ChefMate AI" />
    </View>
    <Button onPress={() => void beginCooking()} style={{ backgroundColor: colors.accent500 }}><ButtonText>▶  Start cooking mode</ButtonText></Button>
  </Page>;
}

export function NutritionScreen() {
  const router = useRouter();
  const toast = useToast();
  const recipes = useAppStore((s) => s.recipes);
  const plan = useAppStore((s) => s.mealPlan);
  const user = useAppStore((s) => s.user);
  const params = useLocalSearchParams<{ recipeId?: string | string[] }>();
  const recipeId = Array.isArray(params.recipeId) ? params.recipeId[0] : params.recipeId;
  const selectedRecipe = recipes.find((recipe) => recipe.id === recipeId);
  const [serverTotals, setServerTotals] = useState<Nutrition | null>(null);
  const [recipeAnalysis, setRecipeAnalysis] = useState<Nutrition | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    void getDailyNutritionSummary().then((result) => {
      const source = result && typeof result === 'object' ? result as Record<string, unknown> : {};
      const values = source.nutrition ?? source.totals ?? source.summary ?? source;
      if (!values || typeof values !== 'object') return;
      const nutrition = values as Record<string, unknown>;
      if (!['calories', 'protein', 'carbs', 'fat', 'fiber', 'totalCalories', 'totalProtein', 'totalCarbs', 'totalFat'].some((key) => key in nutrition)) return;
      if (active) setServerTotals({
        calories: Number(nutrition.calories ?? nutrition.totalCalories) || 0,
        protein: Number(nutrition.protein ?? nutrition.totalProtein) || 0,
        carbs: Number(nutrition.carbs ?? nutrition.totalCarbs) || 0,
        fat: Number(nutrition.fat ?? nutrition.totalFat) || 0,
        fiber: Number(nutrition.fiber) || 0,
      });
    }).catch((error) => {
      if (active) toast(error instanceof Error ? error.message : 'Could not load the nutrition summary.', 'error');
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!selectedRecipe) return;
    let active = true;
    void analyzeRecipeNutrition(selectedRecipe).then((nutrition) => {
      if (active) setRecipeAnalysis(nutrition);
    }).catch((error) => {
      if (active) toast(error instanceof Error ? error.message : 'Could not analyze recipe nutrition.', 'error');
    });
    return () => { active = false; };
  }, [selectedRecipe?.id]);
  const today = plan?.days[(new Date().getDay() + 6) % 7];
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  Object.values(today?.meals ?? {}).forEach((meal) => {
    if (!meal) return;
    totals.calories += meal.nutrition.calories; totals.protein += meal.nutrition.protein; totals.carbs += meal.nutrition.carbs; totals.fat += meal.nutrition.fat; totals.fiber += meal.nutrition.fiber;
  });
  const selected = compare.map((id) => recipes.find((recipe) => recipe.id === id)).filter((recipe): recipe is Recipe => Boolean(recipe));
  const sorted = [...recipes].sort((a, b) => b.nutrition.protein - a.nutrition.protein);
  const toggle = (id: string) => setCompare((old) => old.includes(id) ? old.filter((item) => item !== id) : old.length < 3 ? [...old, id] : old);
  return <Page title="Nutrition Assistant" subtitle="Understand what you eat — per serving and per day." right={<Badge label="Estimates" />}>
    <View style={{ backgroundColor: '#EFF6FF', borderRadius: 16, padding: 12, marginBottom: 15 }}><Txt style={{ color: '#1D4ED8', fontSize: 12, lineHeight: 18 }}>ⓘ All nutrition values are AI-generated estimates, not medical advice. Consult a professional for dietary decisions.</Txt></View>
    {selectedRecipe && recipeAnalysis && <View style={styles.card}><SectionTitle>AI analysis · {selectedRecipe.title}</SectionTitle><NutritionSummary nutrition={recipeAnalysis} /><Txt style={{ color: colors.charcoalMute, fontSize: 10, marginTop: 10 }}>Analysis provided by ChefMate AI.</Txt></View>}
    {today ? <View style={styles.card}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><SectionTitle>Today's plan totals</SectionTitle><Txt style={{ fontSize: 10, color: colors.charcoalMute }}>{user?.nutritionPreference ?? 'Balanced'} target</Txt></View><NutritionSummary nutrition={serverTotals ?? totals} /><Pressable onPress={() => router.push('/app/planner')} style={{ marginTop: 13 }}><Txt style={{ color: colors.forest700, fontWeight: '600', fontSize: 12 }}>View full meal plan ›</Txt></Pressable></View> : <EmptyState title="No meal plan yet" message="Generate a weekly plan to see your daily nutrition summary." action={<Button onPress={() => router.push('/app/planner')}><ButtonText>Open Meal Planner</ButtonText></Button>} />}
    <View style={styles.card}><SectionTitle>⚖ Compare recipes</SectionTitle><Txt style={{ color: colors.charcoalMute, fontSize: 12, marginBottom: 12 }}>Pick up to three recipes to compare per serving.</Txt>
      {!recipes.length ? <Txt style={{ color: colors.charcoalSoft }}>No recipes yet — generate some in AI Kitchen first.</Txt> : <>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{recipes.slice(0, 8).map((recipe) => <Pill key={recipe.id} label={recipe.title} active={compare.includes(recipe.id)} onPress={() => toggle(recipe.id)} />)}</View>
        {selected.map((recipe) => <View key={recipe.id} style={{ borderWidth: 1, borderColor: colors.forest100, borderRadius: 16, padding: 11, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Image source={{ uri: recipe.image }} style={{ width: 62, height: 62, borderRadius: 12 }} /><View style={{ flex: 1 }}><Txt numberOfLines={1} style={{ fontWeight: '600', marginBottom: 6 }}>{recipe.title}</Txt><NutritionSummary nutrition={recipe.nutrition} compact /></View></View>)}
      </>}
    </View>
    {recipes.length > 2 && <View style={[styles.card, { backgroundColor: colors.sage }]}><SectionTitle>🔥 Healthier picks for you</SectionTitle>{[sorted[0], sorted[sorted.length - 1]].map((recipe, index) => recipe && <Pressable key={recipe.id} onPress={() => router.push(`/app/recipe/${recipe.id}`)} style={{ backgroundColor: colors.white, borderRadius: 15, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 }}><Image source={{ uri: recipe.image }} style={{ width: 48, height: 48, borderRadius: 12 }} /><View style={{ flex: 1 }}><Txt style={{ color: colors.accent600, fontSize: 9, fontWeight: '700' }}>{index === 0 ? 'HIGHEST PROTEIN' : 'LIGHTEST OPTION'}</Txt><Txt numberOfLines={1} style={{ fontWeight: '600', marginTop: 2 }}>{recipe.title}</Txt><Txt style={{ color: colors.charcoalMute, fontSize: 10 }}>{index === 0 ? `${recipe.nutrition.protein}g protein per serving` : `only ${recipe.nutrition.calories} kcal per serving`}</Txt></View><ChevronRight size={16} color={colors.charcoalMute} /></Pressable>)}</View>}
  </Page>;
}

export function ActivityScreen() {
  const notifications = useAppStore((s) => s.notifications);
  const jobs = useAppStore((s) => s.automationJobs);
  const toast = useToast();
  const unread = notifications.filter((item) => !item.read).length;
  useEffect(() => {
    void refreshBackendActivity().catch((error) => toast(error instanceof Error ? error.message : 'Could not load activity.', 'error'));
  }, []);
  const readAll = async () => {
    try { await markAllNotificationsRead(); }
    catch (error) { toast(error instanceof Error ? error.message : 'Could not mark notifications as read.', 'error'); }
  };
  const readNotification = async (id: string) => {
    try { await markNotificationRead(id); }
    catch (error) { toast(error instanceof Error ? error.message : 'Could not update notification.', 'error'); }
  };
  const statusColor: Record<string, string> = { completed: colors.forest700, running: colors.accent600, queued: colors.charcoalMute, failed: colors.red };
  return <Page title="Activity" subtitle="Notifications and automation job history." right={<Badge label="Workflow history" />}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 10 }}><SectionTitle>♧ Notifications {unread > 0 ? `(${unread})` : ''}</SectionTitle>{unread > 0 && <Pressable onPress={() => void readAll()}><Txt style={{ color: colors.forest700, fontSize: 11, fontWeight: '600' }}>Mark all read</Txt></Pressable>}</View>
    {notifications.length === 0 ? <EmptyState title="No notifications yet" message="Notifications from your ChefMate account will appear here." /> : notifications.map((item) => <Pressable key={item.id} onPress={() => void readNotification(item.id)} style={[styles.card, { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderLeftWidth: item.read ? 0 : 4, borderLeftColor: colors.accent500, opacity: item.read ? 0.72 : 1 }]}>
      <View style={{ width: 34, height: 34, borderRadius: 18, backgroundColor: item.type === 'expiry' ? colors.accent50 : colors.sage, alignItems: 'center', justifyContent: 'center' }}><Bell size={15} color={item.type === 'expiry' ? colors.accent600 : colors.forest700} /></View>
      <View style={{ flex: 1 }}><Txt style={{ fontWeight: '600' }}>{item.title}{!item.read ? '  •' : ''}</Txt><Txt style={{ color: colors.charcoalSoft, fontSize: 12, lineHeight: 18, marginTop: 3 }}>{item.message}</Txt><Txt style={{ color: colors.charcoalMute, fontSize: 10, marginTop: 4 }}>{formatTime(item.createdAt)}</Txt></View>
    </Pressable>)}
    <SectionTitle style={{ marginTop: 18 }}>Automation history</SectionTitle>
    <Txt style={{ color: colors.charcoalMute, fontSize: 11, marginTop: -7, marginBottom: 10 }}>Every background workflow executed for your account, newest first.</Txt>
    {jobs.map((job) => <View key={job.id} style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt style={{ fontWeight: '600', flex: 1 }}>{job.jobType}</Txt><Txt style={{ color: statusColor[job.status], fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{job.status}</Txt></View>
      {job.workflow && <Txt style={{ color: colors.accent600, fontSize: 9, fontWeight: '700', marginTop: 6 }}>{job.workflow.toUpperCase()}</Txt>}
      <Txt style={{ color: colors.charcoalSoft, fontSize: 12, lineHeight: 18, marginTop: 5 }}>{job.details}</Txt>
      <Txt style={{ color: colors.charcoalMute, fontSize: 10, marginTop: 7 }}>{formatTime(job.createdAt)} {job.durationMs ? `· ${(job.durationMs / 1000).toFixed(1)}s` : ''}</Txt>
    </View>)}
  </Page>;
}

export function ProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAppStore((s) => s.user);
  const recipes = useAppStore((s) => s.recipes);
  const pantry = useAppStore((s) => s.pantry);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [language, setLanguage] = useState(user?.preferredLanguage ?? 'English');
  if (!user) return <Page><EmptyState title="No profile loaded yet" message="Return to the welcome screen or load demo data." action={<Button onPress={() => router.replace('/')}><ButtonText>Go to welcome screen</ButtonText></Button>} /></Page>;
  const favorites = recipes.filter((recipe) => recipe.isFavorite);
  const fields: [string, string][] = [
    ['Language', user.preferredLanguage], ['Diet', user.dietaryPreference], ['Experience', user.cookingExperience],
    ['Household', `${user.householdSize} ${user.householdSize === 1 ? 'person' : 'people'}`], ['Weekly budget', `$${user.weeklyBudget}`],
    ['Cooking time', user.cookingTimePreference], ['Nutrition', user.nutritionPreference],
  ];
  const signOut = async () => {
    try {
      await logoutFromBackend();
      await useAppStore.persist.clearStorage();
      toast('Signed out of ChefMate', 'info');
      router.replace('/');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not sign out.', 'error');
    }
  };
  const saveProfile = async () => {
    try {
      await updateBackendProfile({ ...user, name: name || user.name, preferredLanguage: language });
      setEditing(false);
      toast('Profile updated');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update your profile.', 'error');
    }
  };
  const refreshProfile = async () => {
    try {
      await loadBackendState();
      toast('Account data refreshed');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not refresh account data.', 'error');
    }
  };
  return <Page>
    <View style={{ backgroundColor: colors.forest700, borderRadius: 24, padding: 20, marginBottom: 15 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}><View style={{ width: 58, height: 58, borderRadius: 30, backgroundColor: colors.forest500, alignItems: 'center', justifyContent: 'center' }}><Txt style={{ color: colors.cream, fontSize: 25, fontWeight: '700' }}>{user.name[0] ?? 'C'}</Txt></View><View style={{ flex: 1 }}><Txt style={{ color: colors.cream, fontSize: 20, fontWeight: '700' }}>{user.name}</Txt><Txt style={{ color: '#FAF8F2B0', fontSize: 11, marginTop: 4 }}>{user.email}</Txt><View style={{ marginTop: 6 }}><Badge label="ChefMate account" /></View></View></View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>{[['Recipes', recipes.length], ['Favorites', favorites.length], ['Pantry items', pantry.length]].map(([label, amount]) => <View key={String(label)} style={{ flex: 1, backgroundColor: colors.forest600, borderRadius: 14, padding: 9, alignItems: 'center' }}><Txt style={{ color: colors.cream, fontSize: 17, fontWeight: '700' }}>{amount}</Txt><Txt style={{ color: '#FAF8F2AA', fontSize: 9 }}>{label}</Txt></View>)}</View>
    </View>
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}><SectionTitle>Preferences</SectionTitle><Pressable onPress={() => router.push('/onboarding')}><Txt style={{ color: colors.forest700, fontSize: 11, fontWeight: '600' }}>Edit in setup</Txt></Pressable></View>
      {editing ? <>
        <Field label="Display name" value={name} onChangeText={setName} />
        <Label>Preferred language</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{languages.map((value) => <Pill key={value} label={value} active={language === value} onPress={() => setLanguage(value)} />)}</View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}><Button secondary onPress={() => setEditing(false)} style={{ flex: 1 }}><ButtonText color={colors.charcoalSoft}>Cancel</ButtonText></Button><Button onPress={() => void saveProfile()} style={{ flex: 1 }}><ButtonText>Save</ButtonText></Button></View>
      </> : <>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}><Pressable onPress={() => setEditing(true)}><Txt style={{ color: colors.forest700, fontWeight: '600', fontSize: 12 }}>Edit profile</Txt></Pressable></View>
        {fields.map(([label, value]) => <View key={label} style={{ backgroundColor: colors.cream, borderRadius: 13, padding: 10, marginBottom: 7 }}><Txt style={{ color: colors.charcoalMute, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>{label}</Txt><Txt numberOfLines={2} style={{ fontSize: 12, marginTop: 4 }}>{value}</Txt></View>)}
        {user.allergies.length > 0 && <View style={{ marginTop: 8 }}><Label>Allergies</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{user.allergies.map((item) => <Pill key={item} label={item} />)}</View></View>}
      </>}
    </View>
    <View style={styles.card}><SectionTitle>Favorite cuisines</SectionTitle>{user.favoriteCuisines.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{user.favoriteCuisines.map((cuisine) => <Pill key={cuisine} label={cuisine} />)}</View> : <Txt style={{ color: colors.charcoalSoft }}>No cuisines selected yet.</Txt>}</View>
    {favorites.length > 0 && <View style={styles.card}><SectionTitle>♥ Favorites</SectionTitle><ScrollView horizontal>{favorites.map((recipe) => <Pressable key={recipe.id} onPress={() => router.push(`/app/recipe/${recipe.id}`)} style={{ width: 100, marginRight: 9 }}><Image source={{ uri: recipe.image }} style={{ width: 100, height: 90, borderRadius: 14 }} /><Txt numberOfLines={2} style={{ fontSize: 11, marginTop: 4 }}>{recipe.title}</Txt></Pressable>)}</ScrollView></View>}
    <Button secondary onPress={() => void refreshProfile()} style={{ marginBottom: 9 }}><Heart size={16} color={colors.forest600} /><ButtonText color={colors.charcoal}>Refresh account data</ButtonText></Button>
    <Button secondary onPress={() => void signOut()} style={{ marginBottom: 9 }}><ButtonText color={colors.charcoal}>Sign out</ButtonText></Button>
  </Page>;
}

export function VoiceAssistantScreen() {
  const toast = useToast();
  const voiceHistory = useAppStore((s) => s.voiceHistory);
  const addMessage = useAppStore((s) => s.addVoiceMessage);
  const clearHistory = useAppStore((s) => s.clearVoiceHistory);
  const [language, setLanguage] = useState('en-IN');
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const scrollRef = useRef<ScrollView>(null);
  const wave = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [voiceHistory.length, recording, processing, speaking]);
  useEffect(() => {
    if (!recording && !speaking) {
      wave.stopAnimation();
      wave.setValue(0);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(wave, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(wave, { toValue: 0.25, duration: 280, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [recording, speaking, wave]);
  const handleCommand = async (command: string) => {
    if (!command.trim()) return;
    setProcessing(true);
    const userMessage: VoiceMessage = { id: uid('v'), role: 'user', text: command, timestamp: new Date().toISOString() };
    addMessage(userMessage);
    try {
      const { reply, actionLabel } = await processVoiceCommand(command, { activeRecipe: null }, language);
      if (actionLabel) await loadBackendState();
      addMessage({ id: uid('v'), role: 'assistant', text: reply, action: actionLabel, timestamp: new Date().toISOString() });
      setProcessing(false);
      setSpeaking(true);
      await speakText(reply, language);
    } catch {
      toast('Assistant is down. Please try again.', 'error');
    } finally { setProcessing(false); setSpeaking(false); }
  };
  const start = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) { toast('Microphone permission denied — you can still type commands', 'error'); return; }
      if (!isLiveBackend) {
        toast('Voice unavailable. Connect the app to a server with Sarvam voice configured.', 'error');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
    } catch {
      toast('Could not start recording. Check microphone permissions and try again.', 'error');
    }
  };
  const stop = async () => {
    try {
      await recorder.stop();
      setRecording(false);
      const uri = recorder.uri;
      if (!uri) { toast('No audio recording was created. Please try again.', 'error'); return; }
      if (!isLiveBackend) {
        toast('Voice unavailable. Connect the app to a server with Sarvam voice configured.', 'error');
        return;
      }
      setProcessing(true);
      const audioBase64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const recognized = await transcribeAudio(audioBase64, language);
      if (!recognized.trim()) { toast('No speech was recognized. Try again or type your command.', 'info'); setProcessing(false); return; }
      await handleCommand(recognized);
    } catch {
      setRecording(false);
      setProcessing(false);
      toast('Assistant is down. Please try again.', 'error');
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    }
  };
  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}>
    <HeaderBack />
    <View style={{ alignItems: 'center', marginBottom: 10 }}><Txt style={{ fontSize: 23, fontWeight: '700', textAlign: 'center' }}>ChefMate Voice Assistant</Txt><Txt style={{ color: colors.charcoalSoft, textAlign: 'center', marginTop: 5 }}>Speak naturally — I'll understand, act, and talk back.</Txt><View style={{ marginTop: 7 }}><Badge label="ChefMate Voice AI" /></View></View>
    <View style={[styles.card, { padding: 14, marginBottom: 8, alignItems: 'center', backgroundColor: recording ? colors.forest700 : colors.white }]}>
      <View style={{ height: 42, justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
        {recording || speaking
          ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 36 }}>
            {[0, 1, 2, 3, 4].map((bar) => <Animated.View key={bar} style={{ width: 5, height: 28, borderRadius: 4, backgroundColor: recording ? colors.accent300 : colors.accent500, transform: [{ scaleY: wave.interpolate({ inputRange: [0, 1], outputRange: [0.35 + bar * 0.04, 0.7 + (4 - bar) * 0.06] }) }] }} />)}
            <Txt style={{ color: recording ? colors.cream : colors.charcoalSoft, fontSize: 12, marginLeft: 8 }}>{recording ? 'Listening…' : 'Speaking…'}</Txt>
          </View>
          : processing ? <View style={{ alignItems: 'center', gap: 5 }}><ActivityIndicator size="small" color={colors.forest600} /><Txt style={{ color: colors.charcoalSoft, fontSize: 12 }}>Thinking…</Txt></View>
            : <Txt style={{ color: colors.charcoalMute, fontSize: 12, textAlign: 'center' }}>Tap the mic and speak, or type below</Txt>}
      </View>
      <Pressable onPress={recording ? stop : start} disabled={processing} accessibilityLabel={recording ? 'Stop recording' : 'Start recording'} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: recording ? colors.accent500 : colors.forest700, alignItems: 'center', justifyContent: 'center', opacity: processing ? 0.5 : 1 }}><Mic size={26} color={colors.cream} /></Pressable>
    </View>
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'stretch', marginBottom: 8 }}>
      {VOICE_LANGUAGES.map((item) => <Pressable key={item.code} onPress={() => setLanguage(item.code)} style={[styles.card, { flex: 1, minWidth: 0, minHeight: 40, marginBottom: 0, paddingHorizontal: 4, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: language === item.code ? colors.forest500 : 'transparent' }]}><Txt numberOfLines={1} style={{ textAlign: 'center', fontSize: 10, color: language === item.code ? colors.forest700 : colors.charcoalSoft }}>{item.label}</Txt></Pressable>)}
      <Pressable onPress={() => { const greeting = language === 'hi-IN' ? 'नमस्ते, मैं आपका ChefMate सहायक हूँ। रसोई में मैं आपकी कैसे मदद कर सकता हूँ?' : 'Hello, I am your ChefMate assistant. How can I help you in the kitchen today?'; void speakText(greeting, language).catch(() => toast('Assistant is down. Please try again.', 'error')); }} style={[styles.card, { flex: 1, minWidth: 0, minHeight: 40, marginBottom: 0, paddingHorizontal: 4, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }]}><Txt numberOfLines={1} style={{ color: colors.charcoalSoft, fontSize: 10 }}>◖)) Test voice</Txt></Pressable>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>{DEMO_TRANSCRIPTS.slice(0, 4).map((command) => <Pill key={command} label={`"${command}"`} onPress={() => handleCommand(command)} />)}</View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <Txt style={{ color: colors.charcoalSoft, fontSize: 12, fontWeight: '700' }}>Conversation</Txt>
      {voiceHistory.length > 0 && <Pressable onPress={clearHistory} accessibilityLabel="Clear conversation" hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 }}><Trash2 size={14} color={colors.charcoalMute} /><Txt style={{ color: colors.charcoalMute, fontSize: 11 }}>Clear</Txt></Pressable>}
    </View>
    <ScrollView ref={scrollRef} style={{ flex: 1, minHeight: 180 }} contentContainerStyle={{ paddingBottom: 10 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
      {voiceHistory.length === 0 && <EmptyState title="Conversation history appears here" message="Try a suggested command above." />}
      {voiceHistory.map((message) => <View key={message.id} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '94%', backgroundColor: message.role === 'user' ? colors.forest700 : colors.white, borderRadius: 20, padding: 12, marginBottom: 8 }}><Txt style={{ color: message.role === 'user' ? colors.cream : colors.charcoal, lineHeight: 20 }}>{message.action ? `✦ ${message.action}\n` : ''}{message.text}</Txt><Txt style={{ color: message.role === 'user' ? '#FAF8F299' : colors.charcoalMute, fontSize: 9, marginTop: 5 }}>{formatTime(message.timestamp)}</Txt></View>)}
      {processing && <ActivityIndicator color={colors.forest700} />}
    </ScrollView>
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' }}><TextInput value={text} onChangeText={setText} onSubmitEditing={() => { const command = text.trim(); setText(''); void handleCommand(command); }} returnKeyType="send" placeholder="Type a command instead…" style={[styles.input, { flex: 1, minWidth: 0, height: 52, borderRadius: 18 }]} /><Button onPress={() => { const command = text.trim(); setText(''); void handleCommand(command); }} disabled={!text.trim() || processing} style={{ width: 52, height: 52, paddingHorizontal: 0, paddingVertical: 0 }}><Send size={17} color={colors.cream} /></Button></View>
    <Txt style={{ color: colors.charcoalMute, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 6 }}>Hindi and English voice recognition and responses are powered by Sarvam AI.</Txt>
    </View>
  </KeyboardAvoidingView>;
}




