import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

interface CohereIconProps {
  size?: number;
  color?: string;
}

export const CohereIcon: React.FC<CohereIconProps> = ({ size = 24, color }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8.128 14.099c.592 0 1.77-.033 3.398-.703 1.897-.781 5.672-2.2 8.395-3.656 1.905-1.018 2.74-2.366 2.74-4.18A4.56 4.56 0 0018.1 1H7.549A6.55 6.55 0 001 7.55c0 3.617 2.745 6.549 7.128 6.549z"
        fill="#39594D"
        fillRule="evenodd"
        clipRule="evenodd"
      />
      <Path
        d="M9.912 18.61a4.387 4.387 0 012.705-4.052l3.323-1.38c3.361-1.394 7.06 1.076 7.06 4.715a5.104 5.104 0 01-5.105 5.104l-3.597-.001a4.386 4.386 0 01-4.386-4.387z"
        fill="#D18EE2"
        fillRule="evenodd"
        clipRule="evenodd"
      />
      <Path
        d="M4.776 14.962A3.775 3.775 0 001 18.738v.489a3.776 3.776 0 007.551 0v-.49a3.775 3.775 0 00-3.775-3.775z"
        fill="#FF7759"
      />
    </Svg>
  );
};

export default CohereIcon; 