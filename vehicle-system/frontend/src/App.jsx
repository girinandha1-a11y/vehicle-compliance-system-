import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const VehicleSearch = lazy(() => import('./pages/VehicleSearch'));
const OcrUpload = lazy(() => import('./pages/OcrUpload'));
const Fines = lazy(() => import('./pages/Fines'));
const Cases = lazy(() => import('./pages/Cases'));
const Compliance = lazy(() => import('./pages/Compliance'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Admin = lazy(() => import('./pages/Admin'));
const Intelligence = lazy(() => import('./pages/Intelligence'));
const Documents = lazy(() => import('./pages/Documents'));

export default function App() {
  return (
    <>
      <NavBar />
      <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-10 text-paper/60">Loading workspace...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><VehicleSearch /></ProtectedRoute>} />
        <Route path="/ocr" element={<ProtectedRoute><OcrUpload /></ProtectedRoute>} />
        <Route path="/fines" element={<ProtectedRoute><Fines /></ProtectedRoute>} />
        <Route path="/cases" element={<ProtectedRoute><Cases /></ProtectedRoute>} />
        <Route path="/compliance" element={<ProtectedRoute><Compliance /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/intelligence" element={<ProtectedRoute><Intelligence /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
      </Routes>
      </Suspense>
    </>
  );
}
