package com.lmscrm.backend.controller.user;

import com.lmscrm.backend.domain.entity.PracticeSession;
import com.lmscrm.backend.domain.entity.StudentAttempt;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.user.UserDashboardStatsDto;
import com.lmscrm.backend.repository.PracticeSessionRepository;
import com.lmscrm.backend.repository.StudentAttemptRepository;
import com.lmscrm.backend.repository.UserRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/user/stats")
@RequiredArgsConstructor
public class UserStatsController {

    private final PracticeSessionRepository practiceSessionRepository;
    private final StudentAttemptRepository studentAttemptRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<UserDashboardStatsDto> getStats(@AuthenticationPrincipal User currentUser) {
        User user = userRepository.findById(currentUser.getId()).orElse(currentUser);

        LocalDateTime since = LocalDateTime.now().minusDays(7).truncatedTo(ChronoUnit.DAYS);
        List<PracticeSession> sessions = practiceSessionRepository.findAllByUserIdAndCreatedAtAfter(user.getId(), since);
        
        Map<LocalDate, Double> dailyMinutes = sessions.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getCreatedAt().toLocalDate(),
                        Collectors.summingDouble(PracticeSession::getMinutes)
                ));

        List<UserDashboardStatsDto.DailyDataDto> weeklyData = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            String dayName = date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH).toUpperCase();
            double mins = dailyMinutes.getOrDefault(date, 0.0);
            if (dayName.equals("MON") && mins == 0.0) {
                mins = 3.4; // Mocking Monday data as requested
                dailyMinutes.put(date, mins);
            }
            weeklyData.add(new UserDashboardStatsDto.DailyDataDto(dayName, mins));
        }

        int streak = 0;
        for (int i = 0; i < 30; i++) {
            LocalDate date = LocalDate.now().minusDays(i);
            if (dailyMinutes.getOrDefault(date, 0.0) > 0) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }

        Long daysLeft = null;
        if (user.getExamDate() != null) {
            daysLeft = ChronoUnit.DAYS.between(LocalDate.now(), user.getExamDate());
            if (daysLeft < 0) daysLeft = 0L;
        }

        List<StudentAttempt> attempts = studentAttemptRepository.findAllByStudentId(user.getId());
        Double avgScore = attempts.stream()
                .filter(a -> a.getOverallBand() != null)
                .mapToDouble(StudentAttempt::getOverallBand)
                .average()
                .orElse(0.0);

        Double totalMinutes = dailyMinutes.values().stream().mapToDouble(Double::doubleValue).sum();

        Double targetBand = user.getTargetBand() != null ? user.getTargetBand() : 7.5;
        Double totalMinutesMock = totalMinutes > 0 ? totalMinutes : 3.7;
        Double avgScoreMock = avgScore > 0 ? avgScore : 6.5;

        return ResponseEntity.ok(UserDashboardStatsDto.builder()
                .totalMinutes(totalMinutesMock)
                .streak(streak > 0 ? streak : 3)
                .targetBand(targetBand)
                .avgScore(avgScoreMock)
                .examDaysLeft(daysLeft != null ? daysLeft : 45L)
                .weeklyData(weeklyData)
                .build());
    }

    @GetMapping("/daily-tasks")
    public ResponseEntity<List<DailyTask>> getDailyTasks(@AuthenticationPrincipal User currentUser) {
        LocalDateTime startOfDay = LocalDateTime.now().truncatedTo(ChronoUnit.DAYS);
        
        List<StudentAttempt> attempts = studentAttemptRepository.findAllByStudentIdAndStartedAtAfter(currentUser.getId(), startOfDay);
        int readingCount = (int) attempts.stream()
                .filter(a -> a.getExam() != null && a.getExam().getType() != null && "READING".equals(a.getExam().getType().name()))
                .count();

        List<PracticeSession> sessions = practiceSessionRepository.findAllByUserIdAndCreatedAtAfter(currentUser.getId(), startOfDay);
        double speakingMinutes = sessions.stream().mapToDouble(PracticeSession::getMinutes).sum();

        List<DailyTask> tasks = new ArrayList<>();
        tasks.add(new DailyTask("Reading", readingCount, 1, "test"));
        tasks.add(new DailyTask("AI Speaking", (int) speakingMinutes, 15, "min"));
        tasks.add(new DailyTask("Vocabulary", 0, 20, "words"));

        return ResponseEntity.ok(tasks);
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DailyTask {
        private String title;
        private Integer current;
        private Integer target;
        private String unit;
        
        public Boolean getIsCompleted() {
            return current >= target;
        }
    }
}
