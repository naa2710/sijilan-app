import React from 'react';

const PageContainer = ({ children, className = "" }) => {
  return (
    <div className={`w-full space-y-6 overflow-x-hidden ${className}`}>
      {children}
    </div>
  );
};

export default PageContainer;
