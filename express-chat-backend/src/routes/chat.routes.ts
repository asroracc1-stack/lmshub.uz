import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { canUserMessage, hasConversationAccess } from "../middleware/chatSecurity";

const router = Router();
const prisma = new PrismaClient();

// 1. Get all conversations of the current user
router.get("/conversations", async (req: any, res) => {
  const userId = req.userId;
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, fullName: true, role: true, email: true }
            }
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(conversations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get message history of a conversation
router.get("/conversations/:id/messages", async (req: any, res) => {
  const userId = req.userId;
  const conversationId = req.params.id;

  try {
    const hasAccess = await hasConversationAccess(userId, conversationId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access Denied: You are not a participant in this conversation" });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: { id: true, fullName: true, role: true }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Create or get direct conversation with target user
router.post("/conversations", async (req: any, res) => {
  const userId = req.userId;
  const { targetUserId, title } = req.body;

  if (!targetUserId) {
    return res.status(400).json({ error: "targetUserId is required" });
  }

  try {
    // Check RBAC rules
    const allowed = await canUserMessage(userId, targetUserId);
    if (!allowed) {
      return res.status(403).json({ error: "Access Denied: You are not allowed to message this user under RBAC rules" });
    }

    // Check if 1-to-1 conversation already exists
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: targetUserId } } }
        ]
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, fullName: true, role: true, email: true }
            }
          }
        }
      }
    });

    if (existingConversation) {
      return res.json(existingConversation);
    }

    // Create new conversation
    const sender = await prisma.user.findUnique({ where: { id: userId } });
    const conversation = await prisma.conversation.create({
      data: {
        title: title || null,
        isGroup: false,
        organizationId: sender?.organizationId || null,
        participants: {
          create: [
            { userId },
            { userId: targetUserId }
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, fullName: true, role: true, email: true }
            }
          }
        }
      }
    });

    res.status(201).json(conversation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get list of users the current user can message
router.get("/eligible-users", async (req: any, res) => {
  const userId = req.userId;
  try {
    const users = await prisma.user.findMany({
      where: {
        NOT: { id: userId }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        organizationId: true,
        groupId: true
      }
    });

    const eligibleUsers = [];
    for (const u of users) {
      if (await canUserMessage(userId, u.id)) {
        eligibleUsers.push(u);
      }
    }

    res.json(eligibleUsers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
