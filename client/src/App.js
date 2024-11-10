// App.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:4000');

function App() {
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        socket.on('previous-messages', (msgs) => {
            setMessages(msgs);
        });

        socket.on('message', (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        return () => {
            socket.off('previous-messages');
            socket.off('message');
        };
    }, []);

    const handleLogin = (e) => {
        e.preventDefault();
        if (username.trim()) {
            socket.emit('join', username);
            setIsLoggedIn(true);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim()) {
            socket.emit('chat message', message);
            setMessage('');
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="login-container">
                <form onSubmit={handleLogin}>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="이름을 입력하세요"
                    />
                    <button type="submit">입장</button>
                </form>
            </div>
        );
    }

    return (
        <div className="chat-container">
            <div className="messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.username === username ? 'my-message' : ''}`}>
                        <span className="username">{msg.username}</span>
                        <span className="text">{msg.text}</span>
                        <span className="time">{new Date(msg.time).toLocaleTimeString()}</span>
                    </div>
                ))}
            </div>
            <form onSubmit={handleSubmit} className="input-form">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="메시지를 입력하세요"
                />
                <button type="submit">전송</button>
            </form>
        </div>
    );
}

export default App;