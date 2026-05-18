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
    public LessonDto getLessonById(UUID id) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));
        return mapper.toLessonDto(lesson);
    }

    @Transactional
    public LessonDto createLesson(LessonDto dto, User currentUser) {
        Group group = groupRepository.findById(dto.getGroupId())
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));

        Subject subject = subjectRepository.findById(dto.getSubjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

        User teacher = null;
        if (dto.getTeacherId() != null) {
            teacher = userRepository.findById(dto.getTeacherId())
                    .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
        } else if (group.getTeacherId() != null) {
            teacher = userRepository.findById(group.getTeacherId()).orElse(null);
        }

        Lesson lesson = Lesson.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .group(group)
                .subject(subject)
                .teacher(teacher)
                .room(dto.getRoom())
                .attachmentUrl(dto.getAttachmentUrl())
                .startsAt(dto.getStartsAt() != null ? dto.getStartsAt() : java.time.LocalDateTime.now())
                .endsAt(dto.getEndsAt() != null ? dto.getEndsAt() : java.time.LocalDateTime.now().plusHours(1))
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

        if (currentUser.getRole() != AppRole.SUPER_ADMIN && !lesson.getOrganization().getId().equals(currentUser.getOrganizationId())) {
            throw new RuntimeException("Unauthorized access");
        }

        if (dto.getTitle() != null) lesson.setTitle(dto.getTitle());
        if (dto.getDescription() != null) lesson.setDescription(dto.getDescription());
        if (dto.getRoom() != null) lesson.setRoom(dto.getRoom());
        if (dto.getAttachmentUrl() != null) lesson.setAttachmentUrl(dto.getAttachmentUrl());
        if (dto.getStartsAt() != null) lesson.setStartsAt(dto.getStartsAt());
        if (dto.getEndsAt() != null) lesson.setEndsAt(dto.getEndsAt());
        if (dto.getIsCanceled() != null) lesson.setIsCanceled(dto.getIsCanceled());

        if (dto.getTeacherId() != null) {
            User teacher = userRepository.findById(dto.getTeacherId())
                    .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
            lesson.setTeacher(teacher);
        }

        return mapper.toLessonDto(lessonRepository.save(lesson));
    }

    @Transactional
    public void deleteLesson(UUID id, User currentUser) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

        if (currentUser.getRole() != AppRole.SUPER_ADMIN && !lesson.getOrganization().getId().equals(currentUser.getOrganizationId())) {
            throw new RuntimeException("Unauthorized access");
        }

        lessonRepository.delete(lesson);
    }
}
