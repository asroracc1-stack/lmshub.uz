import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Checks if a sender has permission to message a receiver based on their roles and relationships.
 */
export async function canUserMessage(senderId: string, receiverId: string): Promise<boolean> {
  if (senderId === receiverId) return true; // Can always message oneself/notes

  // 1. Fetch Sender and Receiver details with relations
  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    include: { group: true }
  });

  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    include: { group: true }
  });

  if (!sender || !receiver) return false;

  // Rule 1: SuperAdmin can write to anyone
  if (sender.role === "SUPER_ADMIN") {
    return true;
  }

  // Rule 2: Admin can write to SuperAdmin and anyone in their own organization
  if (sender.role === "ADMIN") {
    if (receiver.role === "SUPER_ADMIN") return true;
    return !!(sender.organizationId && sender.organizationId === receiver.organizationId);
  }

  // Rule 3: Teacher can write to student/parent in their organization, and organization administrators
  if (sender.role === "TEACHER") {
    if (!sender.organizationId || sender.organizationId !== receiver.organizationId) {
      return false;
    }
    return receiver.role === "STUDENT" || receiver.role === "PARENT" || receiver.role === "ADMIN";
  }

  // Rule 4: Parent can write to their children and children's teachers
  if (sender.role === "PARENT") {
    // Check if receiver is parent's child
    if (receiver.role === "STUDENT" && receiver.parentId === sender.id) {
      return true;
    }
    // Check if receiver is a teacher of one of parent's children
    if (receiver.role === "TEACHER") {
      const childWithThisTeacher = await prisma.user.findFirst({
        where: {
          parentId: sender.id,
          group: {
            teacherId: receiver.id,
          },
        },
      });
      if (childWithThisTeacher) return true;
    }
    return false;
  }

  // Rule 5: Student can write to their teachers, parents, and group peers
  if (sender.role === "STUDENT") {
    // Message parent
    if (receiver.role === "PARENT" && sender.parentId === receiver.id) {
      return true;
    }
    // Message teacher of their group
    if (receiver.role === "TEACHER" && sender.groupId) {
      const groupTeacher = await prisma.group.findFirst({
        where: {
          id: sender.groupId,
          teacherId: receiver.id,
        },
      });
      if (groupTeacher) return true;
    }
    // Message other student in the same group
    if (receiver.role === "STUDENT" && sender.groupId && sender.groupId === receiver.groupId) {
      return true;
    }
    return false;
  }

  // Rule 6: USER can only write to PACK_MANAGER
  if (sender.role === "USER") {
    return receiver.role === "PACK_MANAGER";
  }

  // Rule 7: PACK_MANAGER can write to USER, STUDENT, ADMIN, SUPER_ADMIN
  if (sender.role === "PACK_MANAGER") {
    return receiver.role === "USER" || receiver.role === "STUDENT" || receiver.role === "ADMIN" || receiver.role === "SUPER_ADMIN";
  }

  return false;
}


/**
 * Checks if a user has access to a specific conversation thread.
 */
export async function hasConversationAccess(userId: string, conversationId: string): Promise<boolean> {
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId,
    },
  });
  return !!participant;
}

/**
 * Express Middleware for authorization.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Simple custom auth header check for demo/local purposes.
  // In production, this would verify JWT/Session.
  const userId = req.headers["x-user-id"] as string;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: Missing X-User-Id header" });
  }
  (req as any).userId = userId;
  next();
}
