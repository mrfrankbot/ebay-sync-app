import React from 'react';
import { AppProvider, Frame, Navigation } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Listings from './pages/Listings';
import Orders from './pages/Orders';
import Settings from './pages/Settings';
import Logs from './pages/Logs';
import Mappings from './pages/Mappings';

const AppFrame: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            label: 'Dashboard',
            url: '/',
            onClick: () => navigate('/'),
          },
          {
            label: 'Listings',
            url: '/listings',
            onClick: () => navigate('/listings'),
          },
          {
            label: 'Orders',
            url: '/orders',
            onClick: () => navigate('/orders'),
          },
          {
            label: 'Mappings',
            url: '/mappings',
            onClick: () => navigate('/mappings'),
          },
          {
            label: 'Settings',
            url: '/settings',
            onClick: () => navigate('/settings'),
          },
          {
            label: 'Logs',
            url: '/logs',
            onClick: () => navigate('/logs'),
          },
        ]}
      />
    </Navigation>
  );

  return (
    <Frame navigation={navigationMarkup}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/listings" element={<Listings />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/mappings" element={<Mappings />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/logs" element={<Logs />} />
      </Routes>
    </Frame>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppProvider i18n={enTranslations}>
        <AppFrame />
      </AppProvider>
    </BrowserRouter>
  );
};

export default App;
