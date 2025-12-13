import { Server } from 'socket.io';

const onlineUsers = new Map();
let ioInstance = null;

const SocketInit = (server) => {
  ioInstance = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  ioInstance.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('registerUser', (userId) => {
      onlineUsers.set(userId, socket.id);
      console.log(`User registered with socket`);
    });

    socket.on('disconnect', () => {
      for (const [userId, sockId] of onlineUsers.entries()) {
        if (sockId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      console.log('User disconnected:', socket.id);
    });
  });

  return ioInstance;
};

const getIO = () => {
  if (!ioInstance) {
    throw new Error('Socket is not initialized!');
  }
  return ioInstance;
};

export { onlineUsers, SocketInit, getIO };
