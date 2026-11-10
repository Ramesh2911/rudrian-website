import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HistoryScreen } from '../screens/HistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PunchScreen } from '../screens/PunchScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { OfflineBanner } from '../components/OfflineBanner';
import { useOnline } from '../net/useOnline';
import { colors } from '../theme';
import type {
  HistoryStackParamList,
  MainTabParamList,
  ProfileStackParamList,
  PunchStackParamList,
  TodayStackParamList,
} from './types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const Tab = createBottomTabNavigator<MainTabParamList>();
const TodayStack = createNativeStackNavigator<TodayStackParamList>();
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();
const PunchStack = createNativeStackNavigator<PunchStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const screenOptions = { headerShown: false } as const;

function TodayNavigator(): React.JSX.Element {
  return (
    <TodayStack.Navigator screenOptions={screenOptions}>
      <TodayStack.Screen name="Today" component={TodayScreen} />
      <TodayStack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <TodayStack.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
    </TodayStack.Navigator>
  );
}

function HistoryNavigator(): React.JSX.Element {
  return (
    <HistoryStack.Navigator screenOptions={screenOptions}>
      <HistoryStack.Screen name="History" component={HistoryScreen} />
      <HistoryStack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <HistoryStack.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
    </HistoryStack.Navigator>
  );
}

function PunchNavigator(): React.JSX.Element {
  return (
    <PunchStack.Navigator screenOptions={screenOptions}>
      <PunchStack.Screen name="Punch" component={PunchScreen} />
    </PunchStack.Navigator>
  );
}

function ProfileNavigator(): React.JSX.Element {
  return (
    <ProfileStack.Navigator screenOptions={screenOptions}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    </ProfileStack.Navigator>
  );
}

const TAB_ICONS: Record<keyof MainTabParamList, { active: IoniconName; inactive: IoniconName }> = {
  TodayTab: { active: 'today', inactive: 'today-outline' },
  HistoryTab: { active: 'time', inactive: 'time-outline' },
  PunchTab: { active: 'finger-print', inactive: 'finger-print-outline' },
  ProfileTab: { active: 'person', inactive: 'person-outline' },
};

export function MainNavigator(): React.JSX.Element {
  const online = useOnline();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {!online ? <OfflineBanner /> : null}
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 58 + insets.bottom,
            paddingBottom: insets.bottom + 6,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? TAB_ICONS[route.name].active : TAB_ICONS[route.name].inactive}
              size={size}
              color={color}
            />
          ),
        })}
      >
        <Tab.Screen name="TodayTab" component={TodayNavigator} options={{ title: 'Today' }} />
        <Tab.Screen name="HistoryTab" component={HistoryNavigator} options={{ title: 'History' }} />
        <Tab.Screen name="PunchTab" component={PunchNavigator} options={{ title: 'Punch' }} />
        <Tab.Screen name="ProfileTab" component={ProfileNavigator} options={{ title: 'Profile' }} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
