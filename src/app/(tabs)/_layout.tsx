import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { TabBarIcon } from '@/ui/TabBarIcon';
import { useTheme } from '@/ui/useTheme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.today'),
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon
              name={{ ios: 'calendar', android: 'today', web: 'today' }}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library/index"
        options={{
          title: t('tabs.library'),
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon
              name={{ ios: 'books.vertical', android: 'book_2', web: 'book_2' }}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="quick-add"
        options={{
          title: t('tabs.add'),
          tabBarAccessibilityLabel: t('tabs.addLabel'),
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon
              name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
              color={color}
              size={size}
            />
          ),
        }}
        listeners={{
          tabPress: (event) => {
            // [+] is an action, not a destination: open the quick-add modal over the current tab.
            event.preventDefault();
            router.push('/add');
          },
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('tabs.stats'),
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon
              name={{ ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' }}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon
              name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
