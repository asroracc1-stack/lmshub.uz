package com.lmscrm.backend.service.academic;

import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.dto.academic.LessonDto;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.mapper.AcademicMapper;
import com.lmscrm.backend.repository.GroupRepository;
import com.lmscrm.backend.repository.LessonRepository;
import com.lmscrm.backend.repository.SubjectRepository;
import com.lmscrm.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LessonService {

    private final LessonRepository lessonRepository;
    private final GroupRepository groupRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final AcademicMapper mapper;

    @Transactional(readOnly = true)
    public List<LessonDto> getLessonsByGroup(UUID groupId) {
        return lessonRepository.findByGroupIdOrderByStartsAtAsc(groupId).stream()
                .map(mapper::toLessonDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LessonDto> getAllLessonsByOrganization(UUID orgId) {
        return lessonRepository.findByOrganizationIdOrderByStartsAtDesc(orgId).stream()
                .map(mapper::toLessonDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public LessonDto getLessonById(UUID id) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));
        return mapper.toLessonDto(lesson);
    }

    private void validateOverlapping(UUID orgId, UUID teacherId, String room, java.time.LocalDateTime startsAt, java.time.LocalDateTime endsAt, UUID excludeId) {
        if (startsAt == null || endsAt == null) return;
        if (startsAt.isAfter(endsAt) || startsAt.isEqual(endsAt)) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "Boshlanish vaqti tugash vaqtidan oldin bo'lishi shart!"
            );
        }

        // Room overlap check
        if (room != null && !room.trim().isEmpty()) {
            List<Lesson> roomOverlap = lessonRepository.findOverlappingLessonsByRoom(orgId, room.trim(), startsAt, endsAt, excludeId);
            if (!roomOverlap.isEmpty()) {
                throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT, "Bu vaqtda xona band! Dars: " + roomOverlap.get(0).getTitle()
                );
            }
        }

        // Teacher overlap check
        if (teacherId != null) {
            List<Lesson> teacherOverlap = lessonRepository.findOverlappingLessonsByTeacher(orgId, teacherId, startsAt, endsAt, excludeId);
            if (!teacherOverlap.isEmpty()) {
                throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT, "O'qituvchining boshqa darsi bor! Dars: " + teacherOverlap.get(0).getTitle()
                );
            }
        }
    }

    @Transactional
    public LessonDto createLesson(LessonDto dto, User currentUser) {
        Group group = groupRepository.findById(dto.getGroupId())
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));

        if (currentUser.getRole() != AppRole.SUPER_ADMIN && !group.getOrganization().getId().equals(currentUser.getOrganizationId())) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, "Sizda ushbu guruhga dars yaratish huquqi yo'q!"
            );
        }

        Subject subject = subjectRepository.findById(dto.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
        if (currentUser.getRole() != AppRole.SUPER_ADMIN && !subject.getOrganization().getId().equals(currentUser.getOrganizationId())) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, "Fan boshqa tashkilotga tegishli!"
            );
        }

        User teacher = null;
        if (dto.getTeacherId() != null) {
            teacher = userRepository.findById(dto.getTeacherId())
                    .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
            if (currentUser.getRole() != AppRole.SUPER_ADMIN && !teacher.getOrganizationId().equals(currentUser.getOrganizationId())) {
                throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "O'qituvchi boshqa tashkilotga tegishli!"
                );
            }
        } else if (group.getTeacherId() != null) {
            teacher = userRepository.findById(group.getTeacherId()).orElse(null);
        }

        java.time.LocalDateTime startsAt = dto.getStartsAt() != null ? dto.getStartsAt() : java.time.LocalDateTime.now();
        java.time.LocalDateTime endsAt = dto.getEndsAt() != null ? dto.getEndsAt() : startsAt.plusHours(1);

        validateOverlapping(group.getOrganization().getId(), teacher != null ? teacher.getId() : null, dto.getRoom(), startsAt, endsAt, null);

        Lesson lesson = Lesson.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .group(group)
                .subject(subject)
                .teacher(teacher)
                .room(dto.getRoom())
                .attachmentUrl(dto.getAttachmentUrl())
                .startsAt(startsAt)
                .endsAt(endsAt)
                .isCanceled(dto.getIsCanceled() != null ? dto.getIsCanceled() : false)
                .organization(group.getOrganization())
                .createdBy(currentUser)
                .build();

        return mapper.toLessonDto(lessonRepository.save(lesson));
    }

    @Transactional
    public LessonDto updateLesson(UUID id, LessonDto dto, User currentUser) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

        UUID orgId = lesson.getOrganization().getId();
        if (currentUser.getRole() != AppRole.SUPER_ADMIN && !orgId.equals(currentUser.getOrganizationId())) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, "Sizda ushbu darsni tahrirlash huquqi yo'q!"
            );
        }

        if (dto.getGroupId() != null && !dto.getGroupId().equals(lesson.getGroup().getId())) {
            Group group = groupRepository.findById(dto.getGroupId())
                    .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
            if (currentUser.getRole() != AppRole.SUPER_ADMIN && !group.getOrganization().getId().equals(currentUser.getOrganizationId())) {
                throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Sizda ushbu guruhga dars biriktirish huquqi yo'q!"
                );
            }
            lesson.setGroup(group);
        }

        if (dto.getSubjectId() != null && !dto.getSubjectId().equals(lesson.getSubject().getId())) {
            Subject subject = subjectRepository.findById(dto.getSubjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
            if (currentUser.getRole() != AppRole.SUPER_ADMIN && !subject.getOrganization().getId().equals(currentUser.getOrganizationId())) {
                throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Fan boshqa tashkilotga tegishli!"
                );
            }
            lesson.setSubject(subject);
        }

        java.time.LocalDateTime startsAt = dto.getStartsAt() != null ? dto.getStartsAt() : lesson.getStartsAt();
        java.time.LocalDateTime endsAt = dto.getEndsAt() != null ? dto.getEndsAt() : lesson.getEndsAt();
        String room = dto.getRoom() != null ? dto.getRoom() : lesson.getRoom();
        UUID teacherId = lesson.getTeacher() != null ? lesson.getTeacher().getId() : null;

        if (dto.getTeacherId() != null) {
            User teacher = userRepository.findById(dto.getTeacherId())
                    .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
            if (currentUser.getRole() != AppRole.SUPER_ADMIN && !teacher.getOrganizationId().equals(currentUser.getOrganizationId())) {
                throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "O'qituvchi boshqa tashkilotga tegishli!"
                );
            }
            lesson.setTeacher(teacher);
            teacherId = teacher.getId();
        } else if (dto.getGroupId() != null && lesson.getGroup().getTeacherId() != null) {
            User groupTeacher = userRepository.findById(lesson.getGroup().getTeacherId()).orElse(null);
            if (groupTeacher != null) {
                lesson.setTeacher(groupTeacher);
                teacherId = groupTeacher.getId();
            }
        }

        validateOverlapping(orgId, teacherId, room, startsAt, endsAt, lesson.getId());

        if (dto.getTitle() != null) lesson.setTitle(dto.getTitle());
        if (dto.getDescription() != null) lesson.setDescription(dto.getDescription());
        if (dto.getRoom() != null) lesson.setRoom(dto.getRoom());
        if (dto.getAttachmentUrl() != null) lesson.setAttachmentUrl(dto.getAttachmentUrl());
        if (dto.getStartsAt() != null) lesson.setStartsAt(dto.getStartsAt());
        if (dto.getEndsAt() != null) lesson.setEndsAt(dto.getEndsAt());
        if (dto.getIsCanceled() != null) lesson.setIsCanceled(dto.getIsCanceled());

        return mapper.toLessonDto(lessonRepository.save(lesson));
    }

    @Transactional
    public void deleteLesson(UUID id, User currentUser) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

        if (currentUser.getRole() != AppRole.SUPER_ADMIN && !lesson.getOrganization().getId().equals(currentUser.getOrganizationId())) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, "Sizda ushbu darsni o'chirish huquqi yo'q!"
            );
        }

        lessonRepository.delete(lesson);
    }
}
