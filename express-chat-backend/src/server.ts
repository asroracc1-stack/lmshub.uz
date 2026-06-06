import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import chatRoutes from "./routes/chat.routes";
import { requireAuth, hasConversationAccess } from "./middleware/chatSecurity";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust as appropriate for CORS settings
    methods: ["GET", "POST"]
  }
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Register Chat Router
app.use("/api/chat", requireAuth, chatRoutes);

app.get("/health", (req, res) => {
  res.send({ status: "OK", time: new Date() });
});

// Socket.io Connection Handlers
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId as string;
  if (!userId) {
    console.log("Socket connection rejected: missing userId query parameter");
    socket.disconnect();
    return;
  }

  console.log(`User connected: ${userId} (Socket: ${socket.id})`);
  socket.join(`user_${userId}`);

  // Join a Conversation Room
  socket.on("join_room", async ({ conversationId }) => {
    try {
      const allowed = await hasConversationAccess(userId, conversationId);
      if (allowed) {
        socket.join(conversationId);
        console.log(`User ${userId} joined room ${conversationId}`);
      } else {
        socket.emit("error_msg", { message: "Permission Denied: Cannot join conversation" });
      }
    } catch (e) {
      console.error("Error joining room:", e);
    }
  });

  // Leave a Conversation Room
  socket.on("leave_room", ({ conversationId }) => {
    socket.leave(conversationId);
    console.log(`User ${userId} left room ${conversationId}`);
  });

  // Real-time Chat message broadcasting
  socket.on("send_message", async ({ conversationId, body, attachmentUrl }) => {
    try {
      const allowed = await hasConversationAccess(userId, conversationId);
      if (!allowed) {
        socket.emit("error_msg", { message: "Permission Denied: Cannot post to this conversation" });
        return;
      }

      const message = await prisma.message.create({
        data: {
          body,
          attachmentUrl: attachmentUrl || null,
          senderId: userId,
          conversationId
        },
        include: {
          sender: {
            select: { id: true, fullName: true, role: true }
          }
        }
      });

      // Broadcast to all sockets in the conversation room
      io.to(conversationId).emit("new_message", message);

      // Broadcast a global notification to other participants' personal rooms
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId }
      });
      for (const p of participants) {
        if (p.userId !== userId) {
          io.to(`user_${p.userId}`).emit("global_notification", message);
        }
      }
    } catch (err: any) {
      console.error("Error broadcasting message:", err);
      socket.emit("error_msg", { message: "Failed to process message: " + err.message });
    }
  });

  // Real-time Typing indicators
  socket.on("typing", async ({ conversationId, isTyping }) => {
    try {
      const allowed = await hasConversationAccess(userId, conversationId);
      if (allowed) {
        socket.to(conversationId).emit("user_typing", { userId, isTyping });
      }
    } catch (err) {
      // Fail silently
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${userId} (Socket: ${socket.id})`);
  });
});

server.listen(PORT, () => {
  console.log(`Real-time Chat Server is active on port ${PORT}`);
});
