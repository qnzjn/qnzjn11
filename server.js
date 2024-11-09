const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Express 미들웨어 설정
app.use(express.static('public'));
app.use(express.json());

// 사용자 관리를 위한 Map과 Set
const activeUsers = new Map(); // 현재 접속중인 사용자
const registeredNicknames = new Set(); // 등록된 닉네임

// 기본 라우트
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// 닉네임 중복 확인 API
app.post('/check-nickname', (req, res) => {
    const { nickname } = req.body;
    
    // 닉네임 유효성 검사
    if (!nickname || nickname.trim().length < 2) {
        return res.json({ 
            isAvailable: false, 
            message: '닉네임은 2자 이상이어야 합니다.' 
        });
    }

    // 중복 검사
    const isAvailable = !registeredNicknames.has(nickname);
    
    if (isAvailable) {
        registeredNicknames.add(nickname);
    }

    res.json({ 
        isAvailable, 
        message: isAvailable ? '사용 가능한 닉네임입니다.' : '이미 사용 중인 닉네임입니다.' 
    });
});

// Socket.IO 연결 처리
io.on('connection', (socket) => {
    console.log('새로운 사용자가 연결되었습니다.');

    // 새 사용자 입장
    socket.on('new-user', (nickname) => {
        // 이미 등록된 닉네임인지 확인
        if (!registeredNicknames.has(nickname)) {
            registeredNicknames.add(nickname);
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
            // 메시지를 보낸 사용자를 제외한 모든 사용자에게 전송
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
            // 사용자 정보 삭제
            activeUsers.delete(socket.id);
            // registeredNicknames.delete(user.nickname); // 닉네임 유지를 위해 주석 처리

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
});

// 에러 처리
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('서버 오류가 발생했습니다.');
});

// 서버 시작
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});

// 프로세스 종료 처리
process.on('SIGTERM', () => {
    http.close(() => {
        console.log('서버가 종료되었습니다.');
        process.exit(0);
    });
});

// 예외 처리
process.on('uncaughtException', (err) => {
    console.error('처리되지 않은 예외:', err);
    process.exit(1);
});