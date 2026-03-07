import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Veedor from './pages/Veedor';
import Dashboard from './pages/Dashboard';
import ConfigDB from './pages/ConfigDB';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/veedor/*" element={<Veedor />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/admin/config" element={<ConfigDB />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
