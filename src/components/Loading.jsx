import React from 'react';
import './Loading.css';

const Loading = () => {
  return (
    <div className="loading-container">
      <div className="loader">
        <div className="ring"></div>
        <div className="ring"></div>
        <div className="ring"></div>
      </div>
      <p>Loading...</p>
    </div>
  );
};

export default Loading;
