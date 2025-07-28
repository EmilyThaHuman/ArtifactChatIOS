import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface GeminiIconProps {
  size?: number;
  color?: string;
}

export const GeminiIcon: React.FC<GeminiIconProps> = ({ size = 24, color = "#1967D2" }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 24A14.304 14.304 0 000 12 14.304 14.304 0 0012 0a14.305 14.305 0 0012 12 14.305 14.305 0 00-12 12"
        fill={color}
        fillRule="evenodd"
      />
    </Svg>
  );
};

export default GeminiIcon; 