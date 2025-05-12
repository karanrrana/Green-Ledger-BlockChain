import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const history = useHistory();

  const handleLogin = (e) => {
    e.preventDefault();
    // Here you would authenticate the user based on username and password
    // For demonstration purposes, let's assume we have predefined users with roles
    const users = [
      { username: 'admin', password: 'admin', role: 'admin' },
      { username: 'user', password: 'user', role: 'user' }
    ];
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      history.push('/');
    } else {
      alert('Invalid username or password');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-4 bg-white rounded shadow-md">
      <h2 className="text-2xl font-bold mb-4">Login</h2>
      <form onSubmit={handleLogin}>
        <div className="mb-4">
          <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">Username</label>
          <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="border rounded-md px-3 py-2 w-full" required />
        </div>
        <div className="mb-6">
          <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">Password</label>
          <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="border rounded-md px-3 py-2 w-full" required />
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Login</button>
      </form>
    </div>
  );
}

export default Login;
