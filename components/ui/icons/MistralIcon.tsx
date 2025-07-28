import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

interface MistralIconProps {
  size?: number;
  color?: string;
}

export const MistralIcon: React.FC<MistralIconProps> = ({ size = 24, color = "#F97316" }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G>
        <Path d="M15 6v4h-2V6h2zm4-4v4h-2V2h2zM3 2H1h2zM1 2h2v20H1V2zm8 12h2v4H9v-4zm8 0h2v8h-2v-8z" fill={color} />
        <Path d="M19 2h4v4h-4V2zM3 2h4v4H3V2z" fill={color} opacity="0.4" />
        <Path d="M15 10V6h8v4h-8zM3 10V6h8v4H3z" fill={color} opacity="0.5" />
        <Path d="M3 14v-4h20v4z" fill={color} opacity="0.6" />
        <Path d="M11 14h4v4h-4v-4zm8 0h4v4h-4v-4zM3 14h4v4H3v-4z" fill={color} opacity="0.7" />
        <Path d="M19 18h4v4h-4v-4zM3 18h4v4H3v-4z" fill={color} opacity="0.8" />
      </G>
    </Svg>
  );
};

export default MistralIcon; 