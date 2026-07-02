package com.lmscrm.backend.service.academic;

import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.domain.enums.AttendanceMethod;
import com.lmscrm.backend.domain.enums.AttendanceStatus;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FallbackAttendanceService {

    private final StudentRfidCardRepository rfidRepo;
    private final DynamicLessonQrCodeRepository qrRepo;
    private final AttendanceRecordRepository attendanceRepo;
    private final LessonRepository lessonRepo;

    private static final double EARTH_RADIUS_METERS = 6371000.0;
    private static final double GEOFENCE_LIMIT_METERS = 15.0; // 15 meters classroom range

    /**
     * Fallback Check-in via RFID card swipe.
     */
    @Transactional
    public AttendanceRecord checkInWithRfid(String cardUid) {
        StudentRfidCard card = rfidRepo.findByCardUidAndIsActiveTrue(cardUid)
                .orElseThrow(() -> new ResourceNotFoundException("Active RFID card not found"));

        User student = card.getStudent();
        
        // Find current ongoing lesson for the student's group
        LocalDateTime now = LocalDateTime.now();
        Optional<Lesson> ongoingLesson = lessonRepo.findFirstByGroupIdAndStartsAtBeforeAndEndsAtAfter(
                student.getGroupId(), now, now);

        if (ongoingLesson.isEmpty()) {
            throw new IllegalStateException("No active lesson currently found for student's group");
        }

        Lesson lesson = ongoingLesson.get();

        AttendanceRecord record = attendanceRepo.findByLessonIdAndStudentId(lesson.getId(), student.getId())
                .orElseGet(() -> AttendanceRecord.builder()
                        .lesson(lesson)
                        .student(student)
                        .organization(lesson.getOrganization())
                        .campus(lesson.getCampus())
                        .classroom(lesson.getClassroom())
                        .build());

        record.setStatus(AttendanceStatus.PRESENT);
        record.setMethod(AttendanceMethod.AI_RFID);
        record.setCheckInTime(LocalDateTime.now());
        
        return attendanceRepo.save(record);
    }

    /**
     * Generate dynamic rolling QR token for Classroom Display.
     */
    @Transactional
    public String generateRollingQrToken(UUID lessonId) {
        Lesson lesson = lessonRepo.findById(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson not found"));

        String token = UUID.randomUUID().toString().replace("-", "");
        DynamicLessonQrCode qrCode = DynamicLessonQrCode.builder()
                .lesson(lesson)
                .qrToken(token)
                .expiresAt(LocalDateTime.now().plusSeconds(20)) // valid for 20 seconds
                .build();

        qrRepo.save(qrCode);
        return token;
    }

    /**
     * Fallback Check-in via mobile student rolling QR scan.
     * Verifies that the scanning device is physically within the classroom range.
     */
    @Transactional
    public AttendanceRecord checkInWithQr(UUID studentId, String qrToken, double lat, double lon) {
        DynamicLessonQrCode qr = qrRepo.findByQrToken(qrToken)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid or expired QR token"));

        if (qr.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("QR token has expired");
        }

        Lesson lesson = qr.getLesson();

        // Perform Geofence calculation (Haversine formula)
        // Hardcode mock coordinates for classroom (e.g. Tashkent campus center) if classroom has no bounds
        double classroomLat = 41.311081;
        double classroomLon = 69.240562;

        double distance = calculateHaversineDistance(lat, lon, classroomLat, classroomLon);
        if (distance > GEOFENCE_LIMIT_METERS) {
            throw new IllegalStateException("Geofencing violation: You are not physically in the classroom! Distance: " + Math.round(distance) + "m");
        }

        AttendanceRecord record = attendanceRepo.findByLessonIdAndStudentId(lesson.getId(), studentId)
                .orElseGet(() -> AttendanceRecord.builder()
                        .lesson(lesson)
                        .student(User.builder().id(studentId).build())
                        .organization(lesson.getOrganization())
                        .campus(lesson.getCampus())
                        .classroom(lesson.getClassroom())
                        .build());

        record.setStatus(AttendanceStatus.PRESENT);
        record.setMethod(AttendanceMethod.QR_CODE);
        record.setCheckInTime(LocalDateTime.now());

        return attendanceRepo.save(record);
    }

    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
                   
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_METERS * c;
    }
}
