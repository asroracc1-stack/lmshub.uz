package com.lmscrm.backend.mapper;

import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.dto.academic.*;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface AcademicMapper {

    SubjectDto toSubjectDto(Subject subject);

    @Mapping(source = "organization.id", target = "organizationId")
    @Mapping(source = "isActive", target = "isActive")
    @Mapping(source = "direction", target = "direction")
    GroupDto toGroupDto(Group group);

    @Mapping(source = "teacher.id", target = "teacherId")
    @Mapping(source = "teacher.email", target = "teacherName") // We'd ideally use Profile here, but email works as fallback
    @Mapping(source = "subject.id", target = "subjectId")
    @Mapping(source = "subject.name", target = "subjectName")
    GroupTeacherDto toGroupTeacherDto(GroupTeacher groupTeacher);

    @Mapping(source = "group.id", target = "groupId")
    @Mapping(source = "group.name", target = "groupName")
    @Mapping(source = "subject.id", target = "subjectId")
    @Mapping(source = "subject.name", target = "subjectName")
    @Mapping(source = "teacher.id", target = "teacherId")
    @Mapping(source = "teacher.email", target = "teacherName")
    LessonDto toLessonDto(Lesson lesson);

    @Mapping(source = "lesson.id", target = "lessonId")
    @Mapping(source = "student.id", target = "studentId")
    @Mapping(source = "student.email", target = "studentName")
    AttendanceDto toAttendanceDto(Attendance attendance);

    @Mapping(source = "student.id", target = "studentId")
    @Mapping(source = "student.email", target = "studentName")
    @Mapping(source = "teacher.id", target = "teacherId")
    @Mapping(source = "subject.id", target = "subjectId")
    @Mapping(source = "subject.name", target = "subjectName")
    @Mapping(source = "lesson.id", target = "lessonId")
    GradeDto toGradeDto(Grade grade);

    @Mapping(source = "group.id", target = "groupId")
    @Mapping(source = "group.name", target = "groupName")
    @Mapping(source = "subject.id", target = "subjectId")
    @Mapping(source = "subject.name", target = "subjectName")
    @Mapping(source = "teacher.id", target = "teacherId")
    @Mapping(source = "teacher.fullName", target = "teacherName")
    @Mapping(source = "classroom.id", target = "classroomId")
    @Mapping(source = "classroom.name", target = "classroomName")
    @Mapping(source = "organization.id", target = "organizationId")
    WeeklyScheduleDto toWeeklyScheduleDto(WeeklySchedule weeklySchedule);
}
