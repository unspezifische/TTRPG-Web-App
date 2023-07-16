// Login.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Import axios

import './Login.css';

function Login({ setIsLoggedIn, setToken, setUsername: setAppUsername, authenticate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await axios.post('/api/login', {
        username,
        password,
      });

      if (response.data.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
        setAppUsername(username); // Update username state in App.js
        console.log("LOGIN- Username set in handleSubmit:", username); // For testing purposes
        setIsLoggedIn(true); // Update isLoggedIn state in App.js
        setToken(response.data.access_token); // Update token state in App.js

        // Call authenticate after setting the token
        authenticate(response.data.access_token);

        navigate('/inventoryView'); // Navigate to the InventoryView page
      } else {
        setError('Login failed!');
      }
    } catch (error) {
      console.log('An error occurred. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
      </form>
      {error && <p className="error-message">{error}</p>}
      <Link to="/register">Register</Link>
    </div>
  );
}

export default Login;
