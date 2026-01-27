import React from 'react';

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      {children}
    </div>
  );
}

export default Layout;
