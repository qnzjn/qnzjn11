const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// 정적 파일 제공 설정
app.use(express.static('public'));

// 활성 사용자 저장을 위한 Map
const activeUsers = new Map();

// 기본 라우트 설정
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/chat', (req, res) => {
    res.sendFile(__dirname + '/public/chat.html');
});

// Socket.IO 연결 처리
io.on('connection', (socket) => {
    console.log('새로운 사용자가 연결되었습니다.');

    // 새 사용자 입장
    socket.on('new-user', (nickname) => {
        // 사용자 정보 저장
        activeUsers.set(socket.id, {
            id: socket.id,
            nickname: nickname,
            joinTime: new Date()
        });

        // 모든 클라이언트에게 현재 사용자 목록 전송
        io.emit('users-update', {
            userCount: activeUsers.size,
            users: Array.from(activeUsers.values())
        });

        // 다른 사용자들에게 새 사용자 입장 알림
        socket.broadcast.emit('user-connected', {
            nickname: nickname,
            userCount: activeUsers.size
        });

        console.log(`${nickname}님이 입장했습니다. 현재 접속자 수: ${activeUsers.size}`);
    });

    // 채팅 메시지 처리
    socket.on('send-chat-message', (message) => {
        const user = activeUsers.get(socket.id);
        if (user) {
            // 메시지를 보낸 사용자를 제외한 모든 사용자에게 전송
            socket.broadcast.emit('chat-message', {
                nickname: user.nickname,
                message: message,
                timestamp: new Date()
            });
        }
    });

    // 타이핑 상태 처리
    socket.on('typing', () => {
        const user = activeUsers.get(socket.id);
        if (user) {
            socket.broadcast.emit('user-typing', user.nickname);
        }
    });

    socket.on('stop-typing', () => {
        const user = activeUsers.get(socket.id);
        if (user) {
            socket.broadcast.emit('user-stop-typing', user.nickname);
        }
    });

    // 연결 종료 처리
    socket.on('disconnect', () => {
        const user = activeUsers.get(socket.id);
        if (user) {
            // 사용자 정보 삭제
            activeUsers.delete(socket.id);

            // 모든 클라이언트에게 업데이트된 사용자 목록 전송
            io.emit('users-update', {
                userCount: activeUsers.size,
                users: Array.from(activeUsers.values())
            });

            // 다른 사용자들에게 퇴장 알림
            socket.broadcast.emit('user-disconnected', {
                nickname: user.nickname,
                userCount: activeUsers.size
            });

            console.log(`${user.nickname}님이 퇴장했습니다. 현재 접속자 수: ${activeUsers.size}`);
        }
    });
});

// 에러 처리
io.on('error', (error) => {
    console.error('Socket.IO 에러:', error);
});

// 서버 에러 처리
http.on('error', (error) => {
    console.error('서버 에러:', error);
});

// 프로세스 에러 처리
process.on('uncaughtException', (error) => {
    console.error('처리되지 않은 예외:', error);
    // 심각한 에러 발생 시 서버 종료
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('처리되지 않은 프로미스 거부:', reason);
});

// 서버 종료 처리
process.on('SIGTERM', () => {
    console.log('서버를 종료합니다...');
    http.close(() => {
        console.log('서버가 종료되었습니다.');
        process.exit(0);
    });
});

// 서버 시작
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});