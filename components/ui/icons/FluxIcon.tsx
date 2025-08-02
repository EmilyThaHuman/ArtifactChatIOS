import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface FluxIconProps {
  size?: number;
  color?: string;
}

export const FluxIcon: React.FC<FluxIconProps> = ({ size = 24, color = "#ffffff" }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M0 20.683L12.01 2.5 24 20.683h-2.233L12.009 5.878 3.471 18.806h12.122l1.239 1.877H0z"
        fill={color}
        fillRule="evenodd"
      />
      <Path
        d="M8.069 16.724l2.073-3.115 2.074 3.115H8.069z"
        fill={color}
        fillRule="evenodd"
      />
      <Path
        d="M18.24 20.683l-5.668-8.707h2.177l5.686 8.707h-2.196z"
        fill={color}
        fillRule="evenodd"
      />
      <Path
        d="M19.74 11.676l2.13-3.19 2.13 3.19h-4.26z"
        fill={color}
        fillRule="evenodd"
      />
    </Svg>
  );
};

export default FluxIcon;