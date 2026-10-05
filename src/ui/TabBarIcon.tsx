import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

export interface TabBarIconProps {
  name: SymbolViewProps['name'];
  color: ColorValue;
  size: number;
}

/** Decorative: the tab's title is its accessibility label. */
export function TabBarIcon({ name, color, size }: TabBarIconProps) {
  return <SymbolView name={name} tintColor={color} size={size} accessible={false} />;
}
