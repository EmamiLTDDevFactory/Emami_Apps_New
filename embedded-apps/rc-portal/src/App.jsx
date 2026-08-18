import { useEffect } from 'react';
import { Navigate, Route, Routes, Outlet, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import ConsultantDetail from './pages/ConsultantDetail';
import Closure from './pages/Closure';
import RoleMaintenance from './pages/RoleMaintenance';
import FileMaintenance from './pages/FileMaintenance';
import Login from './pages/Login';

const ProtectedRoute = () => {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Timeout duration: 15 minutes of inactivity (standard enterprise security policy)
    // 15 minutes = 15 * 60 * 1000 = 900,000 milliseconds
    const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
    let timeoutId;

    const handleSessionTimeout = () => {
      // Clear session authentication flags
      sessionStorage.clear();
      localStorage.removeItem('employeeId');
      localStorage.removeItem('employeeRole');
      localStorage.removeItem('employeeTa');
      localStorage.removeItem('employeeTm');
      localStorage.removeItem('employeeLd');
      localStorage.removeItem('employeeOd');

      alert("Your session has expired due to inactivity. Please log in again.");
      window.location.href = "/apps/rc-portal/login";
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleSessionTimeout, INACTIVITY_TIMEOUT);
    };

    // Listen for standard user interaction events
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Initialize timer
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

const PublicRoute = ({ children }) => {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const AppLayout = () => (
  <Layout>
    <Outlet />
  </Layout>
);

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/consultants" element={<Dashboard />} />
            <Route path="/consultants/:consultantId" element={<ConsultantDetail />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/onboarding/:consultantId/edit" element={<Onboarding />} />
            <Route path="/roles" element={<RoleMaintenance />} />
            <Route path="/files" element={<FileMaintenance />} />
            <Route path="/closure/:consultantId" element={<Closure />} />
            <Route path="/closure/:consultantId/:closureId" element={<Closure />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </AppProvider>
  );
}

