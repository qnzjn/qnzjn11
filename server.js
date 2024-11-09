const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Express 미들웨어 설정
app.use(express.static('public'));
app.use(express.json());

// 활성 사용자 관리를 위한 Map
const activeUsers = new Map();

// 기본 라우트
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Socket.IO 연결 처리
io.on('connection', (socket) => {
    console.log('새로운 사용자가 연결되었습니다.');

    // 새 사용자 입장
    socket.on('new-user', (nickname) => {
        // 이전 연결이 있다면 제거
        for (let [id, user] of activeUsers.entries()) {
            if (user.nickname === nickname) {
                activeUsers.delete(id);
            }
        }

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
            socket.broadcast.emit('chat-message', {
                nickname: user.nickname,
                message: message,
                timestamp: new Date()
            });
        }
    });

    // 연결 종료 처리
    socket.on('disconnect', () => {
        const user = activeUsers.get(socket.id);
        if (user) {
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

// 서버 에러 처리
http.on('error', (error) => {
    console.error('서버 에러:', error);
});

// 서버 시작
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});

// 프로세스 종료 처리
process.on('SIGTERM', () => {
    console.log('서버를 종료합니다...');
    http.close(() => {
        console.log('서버가 종료되었습니다.');
        process.exit(0);
    });
});

// 예외 처리
process.on('uncaughtException', (error) => {
    console.error('처리되지 않은 예외:', error);
    process.exit(1);
});