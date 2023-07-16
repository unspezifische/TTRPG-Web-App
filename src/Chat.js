import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Form, Button, ToggleButton, ToggleButtonGroup, Modal } from 'react-bootstrap';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import './Chat.css';

import { MyButton, MyButtonGroup } from './MyButton';  // Custom Toggle Button for Mobile

function Chat({ headers, socket, isLoggedIn, characterName }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [error, setError] = useState('');

  // For Mobile
  const [modalOpen, setModalOpen] = useState(false);
  const handleFabClick = () => {
    setModalOpen(prevState => !prevState);
  };

  let lastGroupId = null;

  useEffect(() => {
    const handleMessage = (message) => {
    if (message.sender !== characterName) {
      setUnreadMessages(prevState => ({
        ...prevState,
        [message.sender]: (prevState[message.sender] || 0) + 1
      }));

      setMessages(prevMessages => [...prevMessages, message]);
    } else {
      if (!messages.find(m => m.text === message.text)) {
        setMessages(prevMessages => [...prevMessages, message]);
      }
    }
  }

    const handleActiveUsers = (active_usernames) => {
      console.log('CHAT- CurrentUser:', characterName); // debug log
      const otherUsers = active_usernames.filter(user => user !== characterName);
      console.log('CHAT- Active users:', otherUsers);
      setUsers(otherUsers);
    }

    socket.on('message', handleMessage);
    socket.on('active_users', handleActiveUsers);

    return () => {
      socket.off('message', handleMessage);
      socket.off('active_users', handleActiveUsers);
    }
  }, [socket, characterName]);

  const sendMessage = (event, item = null) => {
    event.preventDefault();

    // Check if there are selected users
    if (selectedUsers.length === 0) {
      setError('No recipients selected.');
      return;
    }

    if (message) {
      const messageObj = {
        type: item ? 'item_transfer' : 'text_message',
        sender: characterName,
        text: message,
        recipients: selectedUsers, // all recipients in one field
        item: item, // item should be an object like { id: 1, quantity: 1, name: 'Sword' }
        group_id: [characterName, ...selectedUsers].sort().join("-")
      };
      console.log("SEND MESSAGE- selectedUsers:", selectedUsers);
      console.log("SEND MESSAGE- messageObj.recipients:", messageObj.recipients);

      socket.emit('sendMessage', messageObj, () => setMessage(''));
      setSelectedUsers([]);   // Clear selected users

      // Also add the sent message to the sender's own message history
      setMessages(prevMessages => [...prevMessages, messageObj]);
    }
    setError(''); // Clear error after sending message
  };

  const handleChange = (selected) => {
    setSelectedUsers(selected);
  };

  const replyAll = (message) => {
    setSelectedUsers([message.sender, ...message.recipients].filter(user => user !== characterName));
  };

  const renderMessage = (message, i, isSameGroup) => (
    <div
      key={i}
      className={`${message.sender === characterName ? "message sent" : "message received"} ${message.sender === characterName ? "grouped" : ""} ${isSameGroup ? "" : "new-group"}`}
      onClick={() => replyAll(message)}
    >
      <div className="message-text">
        {message.sender === characterName ? (
          <>
            {message.type === 'item_transfer' ? `${message.sender} gave you ${message.item.quantity} ${message.item.name}` : message.text}
            <p className="sender">{message.sender}</p>
          </>
        ) : (
          <>
            <p className="sender">{message.sender}</p>
            {message.type === 'item_transfer' ? `${message.sender} gave you ${message.item.quantity} ${message.item.name}` : message.text}
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Interface */}
      <div className="chat-widget d-none d-md-flex">
        <Container>
          <h1>Chat</h1>
          {/* Display active users */}
          <Row>
            {users.length === 0 ? (
              <p>Nobody else here!</p>
            ) : (
              <ToggleButtonGroup
                type="checkbox"
                value={selectedUsers}
                onChange={handleChange}
                vertical
              >
                {users.map((user, i) => (
                  <ToggleButton id={user} value={user} key={i} variant="outline-primary">
                    {user}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            )}
          </Row>
          {/* Message Text Field */}
          <Form onSubmit={sendMessage}>
            <Form.Group>
              <Form.Control
                as="textarea"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyPress={(event) => (event.key === 'Enter' ? sendMessage(event) : null)}
              />
            </Form.Group>
            <div className="d-flex send-interface">
              <p className="error-message">{error}</p>
              <Button variant="primary" type="submit">
                <SendIcon fontSize="large" />
              </Button>
            </div>
          </Form>
          {/* Displays previous messages */}
          <div className="messageContainer">
            {messages.slice().reverse().map((message, i) => {
              const isSameGroup = lastGroupId === message.group_id;
              lastGroupId = message.group_id;  // update the last group ID
              return renderMessage(message, i, isSameGroup);
            })}
          </div>
        </Container>
      </div>

      {/* Mobile Interface */}
      <div className="chat-modal d-md-none">
        <Modal fullscreen show={modalOpen} onHide={() => setModalOpen(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Chat</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {/* Display active users */}
            <Row>
              {users.length === 0 ? (
                <p>Nobody else here!</p>
              ) : (
                <MyButtonGroup value={selectedUsers} onChange={handleChange}>
                  {users.map((user, i) => (
                    <MyButton key={i} value={user} />
                  ))}
                </MyButtonGroup>
              )}
            </Row>
            {/* Message Text Field */}
            <Form onSubmit={sendMessage}>
              <Form.Group>
                <Form.Control
                  as="textarea"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyPress={(event) => (event.key === 'Enter' ? sendMessage(event) : null)}
                />
              </Form.Group>
              <div className="d-flex send-interface">
                <p className="error-message">{error}</p>
                <Button variant="primary" type="submit">
                  <SendIcon fontSize="large" />
                </Button>
              </div>
            </Form>
            {/* Displays previous messages */}
            <div className="messageContainer">
              {messages.slice().map((message, i) => {
                const isSameGroup = lastGroupId === message.group_id;
                lastGroupId = message.group_id;  // update the last group ID
                return renderMessage(message, i, isSameGroup);
              })}
            </div>
          </Modal.Body>
        </Modal>
        <Chat.FAB onClick={handleFabClick} visible={!modalOpen} />
      </div>
    </>
  );
}

Chat.FAB = function({ onClick, visible }) {
  return (
    <Button className="fab" onClick={onClick} style={{ display: visible ? 'block' : 'none' }}>
      <ChatIcon fontSize="large" />
    </Button>
  );
};

export default Chat;
