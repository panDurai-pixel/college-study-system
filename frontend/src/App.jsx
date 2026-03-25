import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import './index.css';

function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    return token ? { role } : null;
  });

  return (
    <Router>
      <div className="layout-container">
        <header className="app-header">
          <h1>College Study Materials</h1>
          <div>
            {user ? (
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <Link to="/admin" className="btn-secondary" style={{ textDecoration: 'none', padding: '0.4rem 0.8rem', fontSize: '0.875rem', height: 'auto', border: '1px solid white', background: 'transparent', color: 'white' }}>Admin Settings</Link>
                <button className="btn-logout" onClick={() => {
                  localStorage.clear();
                  setUser(null);
                  window.location.href = '/';
                }}>Logout Staff</button>
              </div>
            ) : (
              <Link to="/login" className="btn-login-header">Staff Login</Link>
            )}
          </div>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} />
            <Route path="/admin" element={user ? <AdminDashboard /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
