package com.lmscrm.backend.mapper;

import com.lmscrm.backend.domain.entity.Exam;
import com.lmscrm.backend.domain.entity.Passage;
import com.lmscrm.backend.domain.entity.Question;
import com.lmscrm.backend.domain.entity.QuestionOption;
import com.lmscrm.backend.domain.entity.StudentAttempt;
import com.lmscrm.backend.dto.exam.ExamDto;
import com.lmscrm.backend.dto.exam.PassageDto;
import com.lmscrm.backend.dto.exam.QuestionDto;
import com.lmscrm.backend.dto.exam.QuestionOptionDto;
import com.lmscrm.backend.dto.exam.StudentAttemptDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ExamMapper {

    @Mapping(source = "subject.id", target = "subjectId")
    @Mapping(source = "subject.name", target = "subjectName")
    ExamDto toExamDto(Exam exam);

    @Mapping(source = "exam.id", target = "examId")
    @Mapping(source = "passage.id", target = "passageId")
    @Mapping(source = "questionType", target = "questionType")
    QuestionDto toQuestionDto(Question question);

    PassageDto toPassageDto(Passage passage);

    QuestionOptionDto toQuestionOptionDto(QuestionOption option);

    @Mapping(source = "exam.id", target = "examId")
    @Mapping(source = "exam.title", target = "examTitle")
    @Mapping(source = "student.id", target = "studentId")
    @Mapping(source = "student.email", target = "studentName")
    @Mapping(source = "exam", target = "exam")
    StudentAttemptDto toStudentAttemptDto(StudentAttempt attempt);

    StudentAttemptDto.ExamSummary toExamSummary(Exam exam);

    @org.mapstruct.AfterMapping
    default void calculateElapsedSeconds(StudentAttempt attempt, @org.mapstruct.MappingTarget StudentAttemptDto dto) {
        if (attempt.getStartedAt() != null) {
            if (attempt.getFinishedAt() != null) {
                dto.setElapsedSeconds(java.time.Duration.between(attempt.getStartedAt(), attempt.getFinishedAt()).toSeconds());
            } else {
                dto.setElapsedSeconds(java.time.Duration.between(attempt.getStartedAt(), java.time.LocalDateTime.now()).toSeconds());
            }
        }
    }
}
