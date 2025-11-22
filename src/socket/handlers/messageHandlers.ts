import { Server, Socket } from 'socket.io';
import { prisma } from '../../utils/db';
import { sanitizeMessageContent } from '../../utils/contentSanitizer';

export async function handleSendMessage(io: Server, socket: Socket, data: any) {
  try {
    const { conversationId, content, messageType = 'TEXT', replyToId, attachmentUrl, attachmentType } = data;
    const userId = socket.user?.id;

    if (!userId) {
      socket.emit('error', { message: 'User not authenticated' });
      return;
    }

    // Verify participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId
      }
    });

    if (!participant) {
      socket.emit('error', { message: 'Cannot send message to this conversation' });
      return;
    }

    // Check if muted
    if (participant.isMuted) {
      socket.emit('error', { message: 'You are muted in this conversation' });
      return;
    }

    // Validate reply message exists if provided
    if (replyToId) {
      const replyMessage = await prisma.message.findFirst({
        where: {
          id: replyToId,
          conversationId,
        }
      });

      if (!replyMessage) {
        socket.emit('error', { message: 'Reply message not found in this conversation' });
        return;
      }
    }

    // Basic attachment validation
    if (attachmentUrl) {
      try {
        const url = new URL(attachmentUrl);
        if (url.protocol !== 'https:') {
          socket.emit('error', { message: 'Only HTTPS attachment URLs are allowed' });
          return;
        }
        if (!url.hostname.includes('cloudinary.com')) {
          socket.emit('error', { message: 'Only Cloudinary attachments are allowed' });
          return;
        }
      } catch (error) {
        socket.emit('error', { message: 'Invalid attachment URL format' });
        return;
      }
    }

    // Sanitize content
    const sanitizedContent = sanitizeMessageContent(content);

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: sanitizedContent,
        messageType,
        replyToId,
        attachmentUrl,
        attachmentType,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true
          }
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        updatedAt: new Date(),
      }
    });

    // Mark message as read for sender
    await prisma.messageRead.create({
      data: {
        messageId: message.id,
        userId,
        participantId: participant.id,
      }
    });

    // Broadcast to conversation room (exclude sender)
    const roomName = `conversation:${conversationId}`;
    socket.to(roomName).emit('message_received', {
      ...message,
      timestamp: message.createdAt.toISOString()
    });

    // Send confirmation to sender
    socket.emit('message_sent', {
      ...message,
      timestamp: message.createdAt.toISOString()
    });

    console.log(`Message sent in conversation ${conversationId} by ${socket.user?.firstName}`);

  } catch (error) {
    console.error('Error sending message:', error);
    socket.emit('error', { message: 'Failed to send message' });
  }
}