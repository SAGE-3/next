import React, { useEffect, useRef } from 'react';
import { useHexColor } from '@sage3/frontend';

export default function Arrow({ degree }: { degree: number }) {
  const arrowRef = useRef<any>(null);
  const blue = useHexColor('blue.500');

  useEffect(() => {
    const arrowGroup = arrowRef.current;
    //TODO factor in wind speed and change color
    const duration = 2; // in seconds
    const distance = -50; // in pixels

    // Calculate the x and y displacement based on the degree
    const radian = (degree * Math.PI) / 180;
    const x = -Math.cos(radian) * distance - 20;
    const y = -Math.sin(radian) * distance;

    // Calculate the rotation angle based on the degree
    const angle = degree - 90;

    // Apply the animation to the arrow group
    // arrowGroup.style.transformOrigin = '0 0';
    arrowGroup.style.animation = `moveArrow ${duration}s linear infinite`;
    arrowGroup.style.transformOrigin = '0 0';

    // Define the keyframes for the animation
    const keyframes = `
      0% {
        opacity: 0;
        transform:  translate(${-x}px, ${-y}px);
      }
      25% {
        opacity: 1;
      }
      75% {
        opacity: 1;
      }
      100% {
        opacity: 0;
        transform: translate(${x}px, ${y}px);
      }
    `;

    // Create a style element and append the keyframes to it
    const style = document.createElement('style');
    style.innerHTML = `@keyframes moveArrow { ${keyframes} }`;

    // Append the style element to the document head
    document.head.appendChild(style);

    return () => {
      // Remove the animation and style element when the component unmounts
      arrowGroup.style.animation = '';
      document.head.removeChild(style);
    };
  }, [degree]);

  return (
    <g ref={arrowRef}>
      <object type="image/svg+xml" data="./Rain.svg"></object>
      <polygon points="80,130 100,60 120,130 100,125" fill={blue} stroke="black" strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}
