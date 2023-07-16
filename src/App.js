import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, redirect } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import jwtDecode from 'jwt-decode';
import { Container, Row, Col } from 'react-bootstrap';
import Dropdown from 'react-bootstrap/Dropdown';

import UserContext from './UserContext'; // import the context
import Login from './Login';
import Register from './Register';
import InventoryView from './InventoryView';
import Journal from './Journal';
import Library from './Library';
import Chat from './Chat';
import Menu from './Menu';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    const decodedToken = jwtDecode(token);
    if (decodedToken.exp < Date.now() / 1000) {
      // Token is expired, redirect to login page
      window.history.pushState({}, null, "/login");
    } else {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

function App() {
  const [username, setUsername] = useState(null);

  // Socket Stuff
  const [socket, setSocket] = useState(null);
  const [socketLoading, setSocketLoading] = useState(true);
  const [token, setToken] = useState(null);

  // State variables from useAuthHandler
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const [accountType, setAccountType] = useState('');
  const [headers, setHeaders] = useState({});


  // Authentication logic
  const authenticate = (token) => {
    // You can check if a token has been passed to the function
    // If not, you fetch it from localStorage
    token = token || localStorage.getItem('access_token');
    console.log("APP- token (from App):", token);
    if (token) {
      setToken(token);  // set token to state
      setHeaders({
        'Authorization': `Bearer ${token}`
      });
      axios.get('api/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => {
        setIsLoggedIn(true);
        console.log("APP- response:", response.data);
        setCharacterName(response.data.character_name);
        setUsername(response.data.username); // Set username from response
        setAccountType(response.data.account_type);
      })
      .catch(error => {
        setIsLoggedIn(false);
        if (error.response && error.response.status === 503) {
          // If the status code is 503, clear local storage and set isLoggedIn to false
          localStorage.clear();
        }
      })
      .finally(() => {
        setIsLoading(false); // set loading to false after the data is fetched or there's an error
      });
    } else {
      setIsLoggedIn(false);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    authenticate();
  }, []);

  // Emit user_connected after user is authenticated and socket is established
  useEffect(() => {
      if (isLoggedIn && socket) {
          socket.emit('user_connected', { username });
      }
  }, [isLoggedIn, socket, username]);


  // Web Socket stuff
  useEffect(() => {
    if (!token) {
      console.log("APP- No token found yet.")
      // If we don't have a token, don't try to create the socket connection.
      return;
    }

    setSocketLoading(true);
    console.log("APP- Token found.")
    const newSocket = io('/', { query: { token: token } });  // include token in query when establishing connection
    setSocket(newSocket);
    setSocketLoading(false);

    return () => newSocket.close();
  }, [token]);  // depends on token state, so will run after token is set


  // Listeners for 'token_expired' and 'active_users' events
  useEffect(() => {
    if (!socket) return;  // if socket is not yet set, just return

    console.log("APP- socket:", socket);  // For testing purposes

    socket.on('token_expired', () => {
        // redirect to the login page if token is expired
        redirect('/login');
    });

    socket.on('active_users', (active_users) => {
      console.log('APP- Active users:', active_users);
    });

    return () => {  // cleanup function
      socket.off('token_expired');
      socket.off('active_users');
    };
  }, [socket]);  // re-run this effect whenever socket changes
  /***************************/

  return (
    <UserContext.Provider value={{ characterName, accountType, headers, setIsLoggedIn, socket }}>
      <Router>
        {isLoggedIn ? (
          <Container fluid>
            {/* Desktop Layout */}
            <Row className="d-none d-md-flex">
              <Col md={3} className="menu-column">
                <Menu />
              </Col>
              <Col md={6} className="content-column">
                <Routes>
                  <Route path="/inventoryView" element={<InventoryView username={username} characterName={characterName} accountType={accountType} headers={headers} socket={socket} isLoading={isLoading} setIsLoading={setIsLoading} />} />
                  <Route path="/journal" element={<Journal characterName={characterName} headers={headers} isLoading={isLoading} />} />
                  <Route path="/library" element={<Library headers={headers} />} />
                  <Route path="*" element={<Navigate to="/inventoryView" />} /> {/* Default route */}
                </Routes>
              </Col>
              <Col md={3} className="chat-column">
                {!socketLoading && <Chat headers={headers} socket={socket} characterName={characterName} />}
              </Col>
            </Row>

            {/* Mobile Layout */}
            <div className="d-md-none">
              <Row>
                <Menu />
              </Row>
              <Row>
                <Col className="content-column">
                  <Routes>
                    <Route path="/inventoryView" element={<InventoryView username={username} characterName={characterName} accountType={accountType} headers={headers} socket={socket} isLoading={isLoading} setIsLoading={setIsLoading} />} />
                    <Route path="/journal" element={<Journal characterName={characterName} headers={headers} isLoading={isLoading} />} />
                    <Route path="/library" element={<Library headers={headers} />} />
                    <Route path="*" element={<Navigate to="/inventoryView" />} /> {/* Default route */}
                  </Routes>
                </Col>
              </Row>
              <Row className="fixed-bottom">
                {/* Floating Action Button */}
                {/*!socketLoading && <Chat.FAB visible={!modalOpen} onClick={handleFabClick} />*/}
                {!socketLoading && <Chat headers={headers} socket={socket} characterName={characterName} />}
              </Row>
            </div>
          </Container>
        ) : (
          <Container fluid>
            <Routes>
              <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} setToken={setToken} setUsername={(username) => {
                console.log("APP- setUsername called with:", username);
                setUsername(username);
              }} authenticate={authenticate} />} />
              <Route path="/register" element={<Register setIsLoggedIn={setIsLoggedIn} setToken={setToken} setUsername={setUsername} authenticate={authenticate} />} />
              <Route path="*" element={<Navigate to="/login" />} /> {/* Default route */}
            </Routes>
          </Container>
        )}
      </Router>
    </UserContext.Provider>
  );
}

export default App;
