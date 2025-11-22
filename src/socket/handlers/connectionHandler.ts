import { Server as SocketIOServer, Socket } from 'socket.io';
import { createEnhancedPresenceManager } from '../utils/enhancedPresence';
import { handleJoinConversation, handleLeaveConversation } from './conversationHandlers';
import '../types';

// Create a singleton instance that will be initialized with io
let enhancedPresenceManager: ReturnType<typeof createEnhancedPresenceManager>;

export function initializeEnhancedPresence(io: SocketIOServer) {
  enhancedPresenceManager = createEnhancedPresenceManager(io);
}



export function handleEnhancedConnection(io: SocketIOServer, socket: Socket) {
  const userId = socket.user?.id;
  if (!userId) return;

  console.log(`Enhanced connection: ${socket.user?.firstName} ${socket.user?.lastName} (${socket.id})`);

  // Add to presence manager
  enhancedPresenceManager.addUser(userId, socket.id);

  // Enhanced event handlers
  socket.on('set_presence', (data) => {
    enhancedPresenceManager.updateUserPresence(userId, data);
  });

  socket.on('join_conversation', (data) => {
    enhancedPresenceManager.setUserConversation(userId, data.conversationId);
    handleJoinConversation(io, socket, data);
  });

  socket.on('leave_conversation', (data) => {
    enhancedPresenceManager.setUserConversation(userId, undefined);
    handleLeaveConversation(io, socket, data);
  });

  socket.on('typing_start', (data) => {
    enhancedPresenceManager.setTyping(userId, data.conversationId, true);
  });

  socket.on('typing_stop', (data) => {
    enhancedPresenceManager.setTyping(userId, data.conversationId, false);
  });

  socket.on('disconnect', () => {
    enhancedPresenceManager.removeUser(userId, socket.id);
  });

  // Error handler
  socket.on('error', (error) => {
    console.error('Enhanced socket error:', error);
  });

  // Send initial connection status
  socket.emit('connected', {
    userId,
    timestamp: new Date().toISOString()
  });
}