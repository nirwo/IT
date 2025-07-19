import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import LoadingSpinner from './components/Common/LoadingSpinner';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VDIList from './pages/VDI/VDIList';
import VDIDetail from './pages/VDI/VDIDetail';
import ProfileList from './pages/Profiles/ProfileList';
import ProfileDetail from './pages/Profiles/ProfileDetail';
import { CapacityDashboard } from './pages/Capacity';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const AppLayout = ({ children }) => {
  return (
    <div className="app-layout">
      <Header />
      <div className="app-content">
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/vdi" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <VDIList />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/vdi/:id" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <VDIDetail />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profiles" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ProfileList />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profiles/:id" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ProfileDetail />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/capacity" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <CapacityDashboard />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/analytics" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Analytics />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Settings />
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
            </Routes>
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;