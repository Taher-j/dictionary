import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { View, type ColorValue } from 'react-native';

export interface TabBarIconProps {
  name: SymbolViewProps['name'];
  color: ColorValue;
  size: number;
}

/**
 * Decorative: the tab's title is its accessibility label. On Android the symbol is a font glyph,
 * and the tab button would read it as part of its label unless the subtree is hidden.
 */
export function TabBarIcon({ name, color, size }: TabBarIconProps) {
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <SymbolView name={name} tintColor={color} size={size} accessible={false} />
    </View>
  );
}
