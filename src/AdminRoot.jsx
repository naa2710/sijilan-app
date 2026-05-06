import React from 'react';
import App from './App';
import { FinancialProvider } from './context/FinancialContext';

const AdminRoot = () => (
  <FinancialProvider>
    <App />
  </FinancialProvider>
);

export default AdminRoot;
