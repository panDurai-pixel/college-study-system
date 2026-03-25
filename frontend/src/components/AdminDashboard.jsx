import React, { useState } from 'react';
import api from '../api';

function AdminDashboard() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    
    try {
      const res = await api.post('/auth/register', { username, password });
      setMessage(res.data.message);
      setUsername('');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating user');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '500px' }}>
        <h2>Admin Settings</h2>
        <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#64748b' }}>
          Create new staff accounts here. Students cannot access this page.
        </p>

        {message && (
          <div style={{ background: '#dcfce7', color: '#166534', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            ✅ {message}
          </div>
        )}
        {error && <div className="error-message">❌ {error}</div>}
        
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>New Staff Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label>New Staff Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              minLength="6"
            />
          </div>
          <button type="submit" className="btn-primary w-full">Create Staff Account</button>
        </form>
      </div>
    </div>
  );
}

export default AdminDashboard;
