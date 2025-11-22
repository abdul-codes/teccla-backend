import { Server } from 'socket.io';

interface UserPresence {
  userId: string;
  socketIds: Set<string>;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  currentConversation?: string;
  isTyping: Set<string>;
  typingTimeouts: Map<string, NodeJS.Timeout>;
}

class EnhancedPresenceManager {
  private userStates = new Map<string, UserPresence>();
  private typingUsers = new Map<string, Set<string>>();
  private readonly TYPING_TIMEOUT = 3000;
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  addUser(userId: string, socketId: string): void {
    const existing = this.userStates.get(userId);
    const now = new Date();
    
    if (existing) {
      existing.socketIds.add(socketId);
      existing.status = 'online';
      existing.lastSeen = now;
    } else {
      this.userStates.set(userId, {
        userId,
        socketIds: new Set([socketId]),
        status: 'online',
        lastSeen: now,
        isTyping: new Set(),
        typingTimeouts: new Map()
      });
    }
  }

  removeUser(userId: string, socketId: string): void {
    const user = this.userStates.get(userId);
    if (!user) return;

    user.socketIds.delete(socketId);
    
    if (user.socketIds.size === 0) {
      user.status = 'offline';
      user.lastSeen = new Date();
      user.isTyping.clear();
      
      // Clear all typing timeouts
      user.typingTimeouts.forEach(timeout => clearTimeout(timeout));
      user.typingTimeouts.clear();
    }
  }

  updateUserPresence(userId: string, presence: Partial<UserPresence>): void {
    const user = this.userStates.get(userId);
    if (!user) return;

    Object.assign(user, presence);
  }

  setUserConversation(userId: string, conversationId?: string): void {
    const user = this.userStates.get(userId);
    if (!user) return;

    user.currentConversation = conversationId;
  }

  setTyping(userId: string, conversationId: string, isTyping: boolean): void {
    const user = this.userStates.get(userId);
    if (!user) return;

    // Clear existing timeout for this conversation
    const existingTimeout = user.typingTimeouts.get(conversationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (isTyping) {
      user.isTyping.add(conversationId);
      const timeout = setTimeout(() => {
        this.stopTyping(userId, conversationId);
        user.typingTimeouts.delete(conversationId);
      }, this.TYPING_TIMEOUT);
      user.typingTimeouts.set(conversationId, timeout);
    } else {
      user.isTyping.delete(conversationId);
      user.typingTimeouts.delete(conversationId);
    }

    this.broadcastTypingChange(conversationId, userId, isTyping);
  }

  stopTyping(userId: string, conversationId: string): void {
    const user = this.userStates.get(userId);
    if (!user) return;

    user.isTyping.delete(conversationId);
    this.broadcastTypingChange(conversationId, userId, false);
  }

  private broadcastTypingChange(conversationId: string, userId: string, isTyping: boolean): void {
    const typingUsers = this.typingUsers.get(conversationId) || new Set();
    
    if (isTyping) {
      typingUsers.add(userId);
    } else {
      typingUsers.delete(userId);
    }
    
    this.typingUsers.set(conversationId, typingUsers);
    
    const roomName = `conversation:${conversationId}`;
    const typingUsersArray = Array.from(typingUsers);
    
    if (this.io) {
      this.io.to(roomName).emit('typing_users_updated', {
        conversationId,
        typingUsers: typingUsersArray,
        timestamp: new Date().toISOString()
      });
    }
  }

  isUserOnline(userId: string): boolean {
    const user = this.userStates.get(userId);
    return user?.status === 'online';
  }

  getOnlineUsers(): string[] {
    return Array.from(this.userStates.values())
      .filter(user => user.status === 'online')
      .map(user => user.userId);
  }

  getUsersInConversation(conversationId: string): string[] {
    return Array.from(this.userStates.values())
      .filter(user => user.currentConversation === conversationId && user.status === 'online')
      .map(user => user.userId);
  }

  getTypingUsers(conversationId: string): string[] {
    const typingUsers = this.typingUsers.get(conversationId);
    return typingUsers ? Array.from(typingUsers) : [];
  }

  cleanupInactiveUsers(): void {
    const now = new Date();
    const inactiveThreshold = 5 * 60 * 1000;

    this.userStates.forEach((user, userId) => {
      if (user.status === 'online' && 
          now.getTime() - user.lastSeen.getTime() > inactiveThreshold) {
        user.status = 'away';
      }
    });
  }
}

export function createEnhancedPresenceManager(io: Server): EnhancedPresenceManager {
  return new EnhancedPresenceManager(io);
}