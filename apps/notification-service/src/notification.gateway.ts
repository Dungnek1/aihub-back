import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    WebSocketServer,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: [`${process.env.URL_DOMAIN_FRONTEND}`, "http://localhost:5000"],
        credentials: true,
    },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(NotificationGateway.name);
    private connectedUsers = new Map<string, Socket>();


    @SubscribeMessage('join')
    async handleSetClientDataEvent(
        @MessageBody() userID: string,
        @ConnectedSocket() client: Socket,
    ) {
        // ✅ Validate userID exists and is not empty
        if (!userID || userID.trim() === '') {
            console.warn('⚠️ Join event received with empty userID');
            client.emit('error', 'Invalid user ID');
            return;
        }

        // ✅ Store user connection
        this.connectedUsers.set(userID, client);
        this.server.in(userID).socketsJoin(userID);

        console.log(`✅ User ${userID} joined notifications room`);
        console.log(`📊 Total connected users: ${this.connectedUsers.size}`);

        // Notify user of successful join
        client.emit('join', { success: true, message: 'Successfully joined notifications' });
    }

    handleConnection(client: Socket) {
        const userId = client.handshake.auth?.userId;
        this.logger.log(`🔌 Client connected: ${client.id} (User: ${userId || 'anonymous'})`);
    }

    handleDisconnect(client: Socket) {
        const userId = Array.from(this.connectedUsers.entries())
            .find(([, socket]) => socket.id === client.id)?.[0];

        if (userId) {
            this.connectedUsers.delete(userId);
            console.log(`✅ User ${userId} disconnected`);
            console.log(`📊 Total connected users: ${this.connectedUsers.size}`);
            this.logger.log(`User ${userId} disconnected from notifications`);
        } else {
            this.logger.log(`Client ${client.id} disconnected (not in connectedUsers map)`);
        }
    }

    // Method to send notification to a specific user
    sendNotificationToUser(userId: string, notification: any) {
        console.log(`📤 Sending notification to user ${userId}:`, JSON.stringify(notification, null, 2));
        const client = this.connectedUsers.get(userId);

        if (client) {
            client.emit('notification', notification);
            console.log(`✅ Notification successfully sent to user ${userId}`);
        } else {
            this.logger.warn(`⚠️ User ${userId} is not connected, notification queued or not sent`);
            console.log(`📊 Connected users: ${Array.from(this.connectedUsers.keys()).join(', ') || 'none'}`);
        }
    }


    // Method to send tool rating update to all connected users
    broadcastToolRatingUpdate(updateData: any) {
        this.server.emit('tool.rating.update', updateData);
        this.logger.log('Tool rating update broadcasted to all users');
    }

    async handleNotificationSend(data: { userId: string; notification: any }) {
        this.sendNotificationToUser(data.userId, data.notification);
    }

    // Method to broadcast to all connected users (if needed)
    broadcastNotification(notification: any) {
        this.server.emit('notification', notification);
        this.logger.log('Notification broadcasted to all users');
    }
}