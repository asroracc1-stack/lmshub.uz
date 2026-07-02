package com.lmscrm.backend.service.ai;

import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.domain.enums.AttendanceMethod;
import com.lmscrm.backend.domain.enums.AttendanceStatus;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.repository.*;
import com.lmscrm.backend.service.academic.AttendanceAuditService;
import com.lmscrm.backend.service.academic.DynamicAttendanceRuleEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceEngineService {

    private final AttendanceEngineSessionRepository sessionRepo;
    private final StudentPresenceScoreRepository scoreRepo;
    private final AttendanceRecordRepository attendanceRepo;
    private final LessonRepository lessonRepo;
    private final UserRepository userRepo;
    private final GroupMemberRepository groupMemberRepo;
    private final TenantAttendanceRuleRepository rulesRepo;
    private final DynamicAttendanceRuleEngine ruleEngine;
    private final AttendanceAuditService auditService;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    /**
     * Starts a new attendance session for a lesson.
     */
    @Transactional
    public AttendanceEngineSession startSession(UUID lessonId) {
        Lesson lesson = lessonRepo.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

        if (sessionRepo.existsByLessonId(lessonId)) {
            log.info("Session already active for lesson ID: {}", lessonId);
            return sessionRepo.findByLessonId(lessonId).orElseThrow();
        }

        // Initialize session configuration
        TenantAttendanceRule rules = rulesRepo.findByOrganizationId(lesson.getOrganization().getId())
                .orElseGet(() -> TenantAttendanceRule.builder().build());

        AttendanceEngineSession session = AttendanceEngineSession.builder()
                .lesson(lesson)
                .organization(lesson.getOrganization())
                .state("ACTIVE")
                .snapshotIntervalSec(20)
                .minPresenceScore(rules.getMinScorePresent() != null ? rules.getMinScorePresent() : new BigDecimal("0.60"))
                .lateThresholdMin(rules.getLateMinutesLimit() != null ? rules.getLateMinutesLimit() : 10)
                .leftEarlyThresholdMin(rules.getEarlyLeaveLimit() != null ? rules.getEarlyLeaveLimit() : 15)
                .startedAt(LocalDateTime.now())
                .build();

        session = sessionRepo.save(session);

        // Pre-populate student list for tracking
        List<GroupMember> members = groupMemberRepo.findByGroupId(lesson.getGroup().getId());
        for (GroupMember member : members) {
            StudentPresenceScore score = StudentPresenceScore.builder()
                    .session(session)
                    .lesson(lesson)
                    .student(member.getStudent())
                    .organization(lesson.getOrganization())
                    .snapshotsPresent(0)
                    .snapshotsTotal(0)
                    .presenceScore(BigDecimal.ZERO)
                    .build();
            scoreRepo.save(score);
        }

        session.setStudentsTracked(members.size());
        return sessionRepo.save(session);
    }

    /**
     * Process real-time face recognition results for a snapshot.
     */
    @Transactional
    public void processRecognitionResult(UUID lessonId, List<UUID> presentStudentIds, List<Double> confidences) {
        AttendanceEngineSession session = sessionRepo.findByLessonId(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not active for lesson"));

        session.setTotalSnapshots(session.getTotalSnapshots() + 1);
        if (session.getFirstSnapshotAt() == null) {
            session.setFirstSnapshotAt(LocalDateTime.now());
        }
        sessionRepo.save(session);

        LocalDateTime now = LocalDateTime.now();
        List<StudentPresenceScore> scores = scoreRepo.findBySessionId(session.getId());

        for (StudentPresenceScore score : scores) {
            int index = presentStudentIds.indexOf(score.getStudent().getId());
            boolean isPresentThisSnapshot = (index != -1);

            if (isPresentThisSnapshot) {
                score.setSnapshotsPresent(score.getSnapshotsPresent() + 1);
                
                if (score.getFirstSeenAt() == null) {
                    score.setFirstSeenAt(now);
                    long offset = ChronoUnit.MINUTES.between(session.getLesson().getStartsAt(), now);
                    score.setFirstSeenOffsetMin((int) offset);
                }
                score.setLastSeenAt(now);
                
                double conf = confidences.get(index);
                BigDecimal confBD = new BigDecimal(String.valueOf(conf));
                
                if (score.getAvgConfidence() == null) {
                    score.setAvgConfidence(confBD);
                    score.setMinConfidence(confBD);
                } else {
                    BigDecimal totalConf = score.getAvgConfidence().multiply(new BigDecimal(score.getSnapshotsPresent() - 1)).add(confBD);
                    score.setAvgConfidence(totalConf.divide(new BigDecimal(score.getSnapshotsPresent()), 4, RoundingMode.HALF_UP));
                    if (confBD.compareTo(score.getMinConfidence()) < 0) {
                        score.setMinConfidence(confBD);
                    }
                }
            }

            score.setSnapshotsTotal(score.getSnapshotsTotal() + 1);
            score.setPresenceScore(new BigDecimal(score.getSnapshotsPresent())
                    .divide(new BigDecimal(session.getTotalSnapshots()), 4, RoundingMode.HALF_UP));
            
            scoreRepo.save(score);
        }

        // Broadcast real-time update over WebSocket topic
        try {
            messagingTemplate.convertAndSend(
                    "/topic/lesson/" + lessonId + "/attendance-live",
                    scores
            );
        } catch (Exception e) {
            log.error("Failed to broadcast real-time attendance update via WebSocket", e);
        }
    }

    /**
     * Finalizes the attendance session and writes results to the primary attendance records table.
     */
    @Transactional
    public void finalizeSession(UUID lessonId) {
        AttendanceEngineSession session = sessionRepo.findByLessonId(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Active session not found"));

        session.setState("FINAL_DECISION");
        sessionRepo.save(session);

        List<StudentPresenceScore> scores = scoreRepo.findBySessionId(session.getId());

        for (StudentPresenceScore score : scores) {
            // Determine dynamic status
            double presenceRate = score.getPresenceScore().doubleValue();
            
            // Generate checkout offset
            if (score.getLastSeenAt() != null) {
                long offset = ChronoUnit.MINUTES.between(score.getLastSeenAt(), session.getLesson().getEndsAt());
                score.setLastSeenOffsetMin((int) offset);
            }

            // Create record placeholder
            AttendanceRecord record = attendanceRepo.findByLessonIdAndStudentId(lessonId, score.getStudent().getId())
                    .orElseGet(() -> AttendanceRecord.builder()
                            .lesson(session.getLesson())
                            .student(score.getStudent())
                            .organization(session.getOrganization())
                            .campus(session.getLesson().getCampus())
                            .classroom(session.getLesson().getClassroom())
                            .build());

            AttendanceStatus calculatedStatus = ruleEngine.evaluateStatus(record, presenceRate);
            
            AttendanceStatus oldStatus = record.getStatus();
            record.setStatus(calculatedStatus);
            record.setMethod(AttendanceMethod.AI_FACE);
            record.setCheckInTime(score.getFirstSeenAt());
            record.setCheckOutTime(score.getLastSeenAt());
            record.setAiConfidenceScore(score.getAvgConfidence());

            if (score.getFirstSeenOffsetMin() != null && score.getFirstSeenOffsetMin() > session.getLateThresholdMin()) {
                record.setLateMinutes(score.getFirstSeenOffsetMin() - session.getLateThresholdMin());
            }

            attendanceRepo.save(record);

            // Audit
            auditService.logChange(record, null, oldStatus, calculatedStatus,
                    null, AttendanceMethod.AI_FACE,
                    "AI_ENGINE_AUTO_DECISION", null, null, null);

            // Persist evaluation metadata back to score
            score.setFinalStatus(calculatedStatus);
            score.setDecisionMethod("AUTO");
            score.setDecidedAt(LocalDateTime.now());
            scoreRepo.save(score);
        }

        session.setState("COMPLETED");
        session.setCompletedAt(LocalDateTime.now());
        sessionRepo.save(session);

        log.info("Attendance tracking finalized for lesson: {}", lessonId);
    }
}
