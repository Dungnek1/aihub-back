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
import { Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { EventPattern } from '@nestjs/microservices';

@WebSocketGateway({
    cors: {
        origin: [`${process.env.URL_DOMAIN_FRONTEND}`, "http://localhost:5000", "http://localhost:3000"],
        credentials: true,
    },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(NotificationGateway.name);
    private connectedUsers = new Map<string, Socket>();

    constructor(
        @Inject('NOTIFICATION_CLIENT') private readonly notificationClient: ClientProxy,
    ) { }

    @SubscribeMessage('join')
    async handleSetClientDataEvent(
        @MessageBody() userID: string,
        @ConnectedSocket() client: Socket,
    ) {
        if (userID) {
            console.log(`🔗 User ${userID} joining WebSocket room`);
            this.connectedUsers.set(userID, client);
            this.server.in(userID).socketsJoin(userID);
            console.log(`📤 Sending join confirmation to user ${userID}`);
            this.server.to(userID).emit("join", 'User connected');
            console.log(`✅ Join event sent to user ${userID}`);

            // Notify notification service about user connection
            this.notificationClient.emit('user.connected', { userId: userID });
        } else {
            console.log(`❌ No userID provided for join event`);
        }
    }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        const userId = Array.from(this.connectedUsers.entries())
            .find(([, socket]) => socket.id === client.id)?.[0];

        if (userId) {
            this.connectedUsers.delete(userId);
            this.logger.log(`User ${userId} disconnected from notifications`);

            // Notify notification service about user disconnection
            this.notificationClient.emit('user.disconnected', { userId });
        }
    }

    // Method to send notification to a specific user
    sendNotificationToUser(userId: string, notification: any) {
        console.log(`Sending notification to user ${userId}:`, JSON.stringify(notification, null, 2));
        const client = this.connectedUsers.get(userId);
        if (client) {
            client.emit('notification', notification);
            console.log(`Notification successfully sent to user ${userId}`);
        } else {
            this.logger.warn(`User ${userId} is not connected, notification not sent`);
        }
    }

    // Method to broadcast to all connected users (if needed)
    broadcastNotification(notification: any) {
        this.server.emit('notification', notification);
        this.logger.log('Notification broadcasted to all users');
    }

    // Method to send tool rating update to all connected users
    broadcastToolRatingUpdate(updateData: any) {
        this.server.emit('tool.rating.update', updateData);
        this.logger.log('Tool rating update broadcasted to all users');
    }

    // Handle notification send events from notification service
    @EventPattern('notification.send')
    async handleNotificationSend(data: { userId: string; notification: any }) {
        this.sendNotificationToUser(data.userId, data.notification);
    }

    // Handle tool rating update events from tool service
    @EventPattern('tool.rating.update')
    async handleToolRatingUpdate(data: any) {
        this.broadcastToolRatingUpdate(data);
    }
}