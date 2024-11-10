const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// 정적 파일 제공
app.use(express.static('public'));

// 활성 사용자 관리
const activeUsers = new Map();

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

        // 사용자 목록 업데이트
        io.emit('users-update', {
            userCount: activeUsers.size,
            users: Array.from(activeUsers.values())
        });

        // 입장 알림
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
                message: message
            });
        }
    });

    // 연결 종료 처리
    socket.on('disconnect', () => {
        const user = activeUsers.get(socket.id);
        if (user) {
            activeUsers.delete(socket.id);

            // 사용자 목록 업데이트
            io.emit('users-update', {
                userCount: activeUsers.size,
                users: Array.from(activeUsers.values())
            });

            // 퇴장 알림
            socket.broadcast.emit('user-disconnected', {
                nickname: user.nickname,
                userCount: activeUsers.size
            });

            console.log(`${user.nickname}님이 퇴장했습니다. 현재 접속자 수: ${activeUsers.size}`);
        }
    });
});

// 서버 시작
const PORT = 3000;
http.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});