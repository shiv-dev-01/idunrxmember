import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Auth0ProviderWrapper } from './auth/Auth0ProviderWrapper';
import { AuthProvider } from './providers/AuthProvider';
import { AppRoutes } from './routes';
import './styles/nprogress.css';

function App() {
  return (
    <Auth0ProviderWrapper>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </Auth0ProviderWrapper>
  );
}

export default App;