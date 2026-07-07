import { TimetableSlot, Teacher, Classroom, Subject, Group, TimeSettings } from "./timetableSolver";

export interface Conflict {
  id: string;
  type: "TEACHER" | "ROOM" | "CLASS" | "TIME";
  reason: string;
  slotA: TimetableSlot;
  slotB?: TimetableSlot;
}

export interface SuggestedFix {
  type: "MOVE" | "SWAP" | "CHANGE_ROOM";
  description: string;
  action: {
    moveSlotId: string;
    targetDay: number;
    targetSlot: number;
    targetRoomId?: string;
    swapSlotId?: string;
  };
}

export function detectTimetableConflicts(
  slots: TimetableSlot[],
  teachers: Teacher[],
  rooms: Classroom[]
): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < slots.length; i++) {
    const slotA = slots[i];

    // Check teacher unavailable bounds
    const teacher = teachers.find(t => t.id === slotA.teacherId);
    if (teacher) {
      if (teacher.unavailableDays.includes(slotA.dayOfWeek) || 
          teacher.unavailableSlots.includes(`${slotA.dayOfWeek}-${slotA.slotIndex}`)) {
        conflicts.push({
          id: `teacher-avail-${slotA.id}`,
          type: "TIME",
          reason: `Teacher ${teacher.fullName} is unavailable on day ${slotA.dayOfWeek}, slot ${slotA.slotIndex}`,
          slotA
        });
      }
    }

    // Check classroom unavailable bounds
    const room = rooms.find(r => r.id === slotA.classroomId);
    if (room && room.unavailableSlots?.includes(`${slotA.dayOfWeek}-${slotA.slotIndex}`)) {
      conflicts.push({
        id: `room-avail-${slotA.id}`,
        type: "TIME",
        reason: `Classroom ${room.name} is unavailable on day ${slotA.dayOfWeek}, slot ${slotA.slotIndex}`,
        slotA
      });
    }

    // Double bookings comparison loop
    for (let j = i + 1; j < slots.length; j++) {
      const slotB = slots[j];

      // Must be in the same day and slot to conflict
      if (slotA.dayOfWeek === slotB.dayOfWeek && slotA.slotIndex === slotB.slotIndex) {
        
        // 1. Teacher busy double booking
        if (slotA.teacherId !== "unassigned" && slotA.teacherId === slotB.teacherId) {
          conflicts.push({
            id: `teacher-clash-${slotA.id}-${slotB.id}`,
            type: "TEACHER",
            reason: `Teacher ${slotA.teacherName} is scheduled for both ${slotA.groupName} and ${slotB.groupName}`,
            slotA,
            slotB
          });
        }

        // 2. Room double booking
        if (slotA.classroomId === slotB.classroomId) {
          conflicts.push({
            id: `room-clash-${slotA.id}-${slotB.id}`,
            type: "ROOM",
            reason: `Classroom ${slotA.room} is occupied by both ${slotA.groupName} and ${slotB.groupName}`,
            slotA,
            slotB
          });
        }

        // 3. Class double booking (group busy)
        if (slotA.groupId === slotB.groupId) {
          conflicts.push({
            id: `group-clash-${slotA.id}-${slotB.id}`,
            type: "CLASS",
            reason: `Group ${slotA.groupName} has two overlapping lessons: ${slotA.subjectName} and ${slotB.subjectName}`,
            slotA,
            slotB
          });
        }
      }
    }
  }

  return conflicts;
}

export function generateSuggestedFixes(
  conflict: Conflict,
  allSlots: TimetableSlot[],
  teachers: Teacher[],
  rooms: Classroom[],
  settings: TimeSettings
): SuggestedFix[] {
  const suggestions: SuggestedFix[] = [];
  const slotA = conflict.slotA;

  // Option 1: Move Slot A to a completely free day/slot
  const days = settings.workingDays;
  const possibleSlots = [1, 2, 3, 4, 5, 6, 7, 8];

  for (const day of days) {
    for (const slot of possibleSlots) {
      // Check if group is busy
      const groupOccupied = allSlots.some(s => s.groupId === slotA.groupId && s.dayOfWeek === day && s.slotIndex === slot);
      if (groupOccupied) continue;

      // Check if teacher is busy
      const teacherOccupied = slotA.teacherId !== "unassigned" && allSlots.some(s => s.teacherId === slotA.teacherId && s.dayOfWeek === day && s.slotIndex === slot);
      if (teacherOccupied) continue;

      // Check if teacher is available in setting limits
      const teacherObj = teachers.find(t => t.id === slotA.teacherId);
      if (teacherObj) {
        if (teacherObj.unavailableDays.includes(day) || teacherObj.unavailableSlots.includes(`${day}-${slot}`)) continue;
      }

      // Check if classroom is free
      const roomOccupied = allSlots.some(s => s.classroomId === slotA.classroomId && s.dayOfWeek === day && s.slotIndex === slot);
      if (roomOccupied) continue;

      const dayNames: Record<number, string> = {
        1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat"
      };

      suggestions.push({
        type: "MOVE",
        description: `Move ${slotA.subjectName} to ${dayNames[day] || "Day " + day} Slot ${slot}`,
        action: {
          moveSlotId: slotA.id,
          targetDay: day,
          targetSlot: slot
        }
      });

      // Stop once we find 2 move suggestions
      if (suggestions.filter(s => s.type === "MOVE").length >= 2) break;
    }
    if (suggestions.length >= 2) break;
  }

  // Option 2: Swap lessons inside same class
  const classLessons = allSlots.filter(s => s.groupId === slotA.groupId && s.id !== slotA.id);
  classLessons.forEach(otherSlot => {
    // Check if slotA's teacher is available at otherSlot's time
    const tA = teachers.find(t => t.id === slotA.teacherId);
    if (tA) {
      const busyAtTarget = allSlots.some(s => s.teacherId === slotA.teacherId && s.dayOfWeek === otherSlot.dayOfWeek && s.slotIndex === otherSlot.slotIndex && s.id !== slotA.id);
      if (busyAtTarget) return;
    }

    // Check if otherSlot's teacher is available at slotA's time
    const tB = teachers.find(t => t.id === otherSlot.teacherId);
    if (tB) {
      const busyAtA = allSlots.some(s => s.teacherId === otherSlot.teacherId && s.dayOfWeek === slotA.dayOfWeek && s.slotIndex === slotA.slotIndex && s.id !== otherSlot.id);
      if (busyAtA) return;
    }

    const dayNames: Record<number, string> = {
      1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat"
    };

    suggestions.push({
      type: "SWAP",
      description: `Swap with ${otherSlot.subjectName} on ${dayNames[otherSlot.dayOfWeek] || "Day " + otherSlot.dayOfWeek} Slot ${otherSlot.slotIndex}`,
      action: {
        moveSlotId: slotA.id,
        targetDay: otherSlot.dayOfWeek,
        targetSlot: otherSlot.slotIndex,
        swapSlotId: otherSlot.id
      }
    });
  });

  // Option 3: Change room if conflict is a room clash
  if (conflict.type === "ROOM" && conflict.slotB) {
    const freeRooms = rooms.filter(r => {
      // Must not be occupied in the current slot
      const occupied = allSlots.some(s => s.classroomId === r.id && s.dayOfWeek === slotA.dayOfWeek && s.slotIndex === slotA.slotIndex);
      return !occupied && r.capacity >= 10;
    });

    freeRooms.forEach(r => {
      suggestions.push({
        type: "CHANGE_ROOM",
        description: `Change Classroom for ${slotA.subjectName} to ${r.name}`,
        action: {
          moveSlotId: slotA.id,
          targetDay: slotA.dayOfWeek,
          targetSlot: slotA.slotIndex,
          targetRoomId: r.id
        }
      });
    });
  }

  return suggestions.slice(0, 3); // limit to top 3 fixes
}
