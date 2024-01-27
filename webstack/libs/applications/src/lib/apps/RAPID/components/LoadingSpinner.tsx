import React from 'react';

import '../styling.css'

const LoadingSpinner = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'white'
      }}
    >
      <span className="loading" />
    </div>
  );
};

export default LoadingSpinner;
