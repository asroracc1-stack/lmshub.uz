package com.lmscrm.backend.service.academic;

import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.dto.academic.WeeklyScheduleDto;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.mapper.AcademicMapper;
import com.lmscrm.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WeeklyScheduleService {

    private final WeeklyScheduleRepository weeklyScheduleRepository;
    private final GroupRepository groupRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final ClassroomRepository classroomRepository;
    private final LessonRepository lessonRepository;
    private final AcademicMapper mapper;

    @Transactional(readOnly = true)
    public List<WeeklyScheduleDto> getSchedulesByOrganization(UUID orgId) {
        return weeklyScheduleRepository.findByOrganizationId(orgId).stream()
                .map(mapper::toWeeklyScheduleDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WeeklyScheduleDto> getSchedulesByGroup(UUID groupId) {
        return weeklyScheduleRepository.findByGroupId(groupId).stream()
                .map(mapper::toWeeklyScheduleDto)
                .collect(Collectors.toList());
    }

    private void validateScheduleOverlap(UUID orgId, UUID groupId, UUID teacherId, UUID classroomId, String room,
                                         Integer dayOfWeek, LocalTime startTime, LocalTime endTime, UUID excludeId) {
        if (startTime == null || endTime == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Boshlanish va tugash vaqtlari bo'sh bo'lishi mumkin emas!");
        }
        if (startTime.isAfter(endTime) || startTime.equals(endTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Boshlanish vaqti tugash vaqtidan oldin bo'lishi shart!");
        }
        if (dayOfWeek < 1 || dayOfWeek > 7) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hafta kuni noto'g'ri (1-7 oralig'ida bo'lishi shart)!");
        }

        // 1. Group overlap check
        List<WeeklySchedule> groupOverlap = weeklyScheduleRepository.findOverlappingForGroup(orgId, groupId, dayOfWeek, startTime, endTime, excludeId);
        if (!groupOverlap.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT, "Guruhning ushbu vaqtda boshqa darsi bor! Guruh: " + groupOverlap.get(0).getGroup().getName() + 
                ", Dars: " + groupOverlap.get(0).getSubject().getName()
            );
        }

        // 2. Teacher overlap check
        if (teacherId != null) {
            List<WeeklySchedule> teacherOverlap = weeklyScheduleRepository.findOverlappingForTeacher(orgId, teacherId, dayOfWeek, startTime, endTime, excludeId);
            if (!teacherOverlap.isEmpty()) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "O'qituvchining ushbu vaqtda boshqa darsi bor! O'qituvchi: " + teacherOverlap.get(0).getTeacher().getFullName() + 
                    ", Guruh: " + teacherOverlap.get(0).getGroup().getName()
                );
            }
        }

        // 3. Room/Classroom overlap check
        if (classroomId != null || (room != null && !room.trim().isEmpty())) {
            List<WeeklySchedule> roomOverlap = weeklyScheduleRepository.findOverlappingForRoom(orgId, classroomId, room != null ? room.trim() : null, dayOfWeek, startTime, endTime, excludeId);
            if (!roomOverlap.isEmpty()) {
                String overlapRoomName = roomOverlap.get(0).getClassroom() != null ? roomOverlap.get(0).getClassroom().getName() : roomOverlap.get(0).getRoom();
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Xona ushbu vaqtda band! Xona: " + overlapRoomName + 
                    ", Guruh: " + roomOverlap.get(0).getGroup().getName()
                );
            }
        }
    }

    @Transactional
    public WeeklyScheduleDto createSchedule(WeeklyScheduleDto dto, User currentUser) {
        Group group = groupRepository.findById(dto.getGroupId())
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));

        if (currentUser.getRole() != AppRole.SUPER_ADMIN && !group.getOrganization().getId().equals(currentUser.getOrganizationId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sizda ushbu guruhga dars jadvali qo'shish huquqi yo'q!");
        }

        Subject subject = subjectRepository.findById(dto.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

        User teacher = null;
        if (dto.getTeacherId() != null) {
            teacher = userRepository.findById(dto.getTeacherId())
                    .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        }

        Classroom classroom = null;
        if (dto.getClassroomId() != null) {
            classroom = classroomRepository.findById(dto.getClassroomId()).orElse(null);
        }

        UUID orgId = group.getOrganization().getId();

        validateScheduleOverlap(orgId, group.getId(), teacher != null ? teacher.getId() : null,
                classroom != null ? classroom.getId() : null, dto.getRoom(), dto.getDayOfWeek(),
                dto.getStartTime(), dto.getEndTime(), null);

        WeeklySchedule schedule = WeeklySchedule.builder()
                .organization(group.getOrganization())
                .group(group)
                .subject(subject)
                .teacher(teacher)
                .classroom(classroom)
                .room(dto.getRoom())
                .dayOfWeek(dto.getDayOfWeek())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .build();

        return mapper.toWeeklyScheduleDto(weeklyScheduleRepository.save(schedule));
    }

    @Transactional
    public WeeklyScheduleDto updateSchedule(UUID id, WeeklyScheduleDto dto, User currentUser) {
        WeeklySchedule schedule = weeklyScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Timetable slot not found"));

        UUID orgId = schedule.getOrganization().getId();
        if (currentUser.getRole() != AppRole.SUPER_ADMIN && !orgId.equals(currentUser.getOrganizationId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sizda ushbu dars jadvalini tahrirlash huquqi yo'q!");
        }

        if (dto.getGroupId() != null && !dto.getGroupId().equals(schedule.getGroup().getId())) {
            Group group = groupRepository.findById(dto.getGroupId())
                    .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
            schedule.setGroup(group);
        }

        if (dto.getSubjectId() != null && !dto.getSubjectId().equals(schedule.getSubject().getId())) {
            Subject subject = subjectRepository.findById(dto.getSubjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
            schedule.setSubject(subject);
        }

        if (dto.getTeacherId() != null) {
            User teacher = userRepository.findById(dto.getTeacherId())
                    .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
            schedule.setTeacher(teacher);
        } else if (dto.getTeacherId() == null && dto.getGroupId() != null) {
            // keep or clear
            schedule.setTeacher(null);
        }

        if (dto.getClassroomId() != null) {
            Classroom classroom = classroomRepository.findById(dto.getClassroomId()).orElse(null);
            schedule.setClassroom(classroom);
        } else {
            schedule.setClassroom(null);
        }

        if (dto.getRoom() != null) {
            schedule.setRoom(dto.getRoom());
        }

        if (dto.getDayOfWeek() != null) schedule.setDayOfWeek(dto.getDayOfWeek());
        if (dto.getStartTime() != null) schedule.setStartTime(dto.getStartTime());
        if (dto.getEndTime() != null) schedule.setEndTime(dto.getEndTime());

        validateScheduleOverlap(orgId, schedule.getGroup().getId(), 
                schedule.getTeacher() != null ? schedule.getTeacher().getId() : null,
                schedule.getClassroom() != null ? schedule.getClassroom().getId() : null, 
                schedule.getRoom(), schedule.getDayOfWeek(), schedule.getStartTime(), schedule.getEndTime(), schedule.getId());

        return mapper.toWeeklyScheduleDto(weeklyScheduleRepository.save(schedule));
    }

    @Transactional
    public void deleteSchedule(UUID id, User currentUser) {
        WeeklySchedule schedule = weeklyScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Timetable slot not found"));

        if (currentUser.getRole() != AppRole.SUPER_ADMIN && !schedule.getOrganization().getId().equals(currentUser.getOrganizationId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sizda ushbu dars jadvalini o'chirish huquqi yo'q!");
        }

        weeklyScheduleRepository.delete(schedule);
    }

    @Transactional
    public int generateLessonsFromSchedule(UUID orgId, LocalDate startDate, LocalDate endDate, User currentUser) {
        if (startDate.isAfter(endDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Boshlanish sanasi tugash sanasidan keyin bo'lishi mumkin emas!");
        }

        List<WeeklySchedule> schedules = weeklyScheduleRepository.findByOrganizationId(orgId);
        if (schedules.isEmpty()) {
            return 0;
        }

        int createdCount = 0;

        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            int dayOfWeekVal = date.getDayOfWeek().getValue(); // 1 = Mon, ..., 7 = Sun
            
            // Find schedules for this day of week
            List<WeeklySchedule> daySchedules = schedules.stream()
                    .filter(s -> s.getDayOfWeek() == dayOfWeekVal)
                    .collect(Collectors.toList());

            for (WeeklySchedule ws : daySchedules) {
                LocalDateTime lessonStart = LocalDateTime.of(date, ws.getStartTime());
                LocalDateTime lessonEnd = LocalDateTime.of(date, ws.getEndTime());

                // Check if a concrete lesson already exists for this group, subject, and time
                boolean exists = lessonRepository.findByGroupIdOrderByStartsAtAsc(ws.getGroup().getId()).stream()
                        .anyMatch(l -> l.getStartsAt().equals(lessonStart) && l.getSubject().getId().equals(ws.getSubject().getId()));

                if (!exists) {
                    Lesson lesson = Lesson.builder()
                            .title(ws.getSubject().getName())
                            .description("Haftalik dars jadvalidan avtomatik yaratildi")
                            .group(ws.getGroup())
                            .subject(ws.getSubject())
                            .teacher(ws.getTeacher())
                            .classroom(ws.getClassroom())
                            .room(ws.getRoom() != null ? ws.getRoom() : (ws.getClassroom() != null ? ws.getClassroom().getName() : ""))
                            .startsAt(lessonStart)
                            .endsAt(lessonEnd)
                            .isCanceled(false)
                            .organization(ws.getOrganization())
                            .createdBy(currentUser)
                            .build();

                    lessonRepository.save(lesson);
                    createdCount++;
                }
            }
        }

        return createdCount;
    }
}
