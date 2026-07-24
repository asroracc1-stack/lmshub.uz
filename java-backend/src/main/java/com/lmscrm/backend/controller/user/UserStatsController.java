package com.lmscrm.backend.controller.user;

import com.lmscrm.backend.domain.entity.PracticeSession;
import com.lmscrm.backend.domain.entity.StudentAttempt;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.ExamType;
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

        LocalDateTime since365Days = LocalDateTime.now().minusDays(365).truncatedTo(ChronoUnit.DAYS);
        List<PracticeSession> sessions = practiceSessionRepository.findAllByUserIdAndCreatedAtAfter(user.getId(), since365Days);
        
        Map<LocalDate, Double> dailyMinutes = sessions.stream()
                .filter(s -> s.getCreatedAt() != null)
                .collect(Collectors.groupingBy(
                        s -> s.getCreatedAt().toLocalDate(),
                        Collectors.summingDouble(s -> s.getMinutes() != null ? s.getMinutes() : 0.0)
                ));

        List<StudentAttempt> attempts = studentAttemptRepository.findAllByStudentId(user.getId());
        List<UserDashboardStatsDto.DailyDataDto> weeklyData = new ArrayList<>();

        // Use current calendar week Mon–Sun so the chart bars always align with the frontend
        LocalDate today = LocalDate.now();
        int todayDow = today.getDayOfWeek().getValue(); // Mon=1 … Sun=7
        LocalDate monday = today.minusDays(todayDow - 1);

        for (int i = 0; i < 7; i++) {
            LocalDate date = monday.plusDays(i);
            String dayName = date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH).toUpperCase();
            Double minsVal = dailyMinutes.get(date);
            double mins = minsVal != null ? minsVal : 0.0;

            // Filter attempts finished on this date
            LocalDate finalDate = date;
            List<StudentAttempt> dayAttempts = attempts.stream()
                    .filter(a -> a.getFinishedAt() != null && a.getFinishedAt().toLocalDate().equals(finalDate))
                    .collect(Collectors.toList());

            Double readingVal = dayAttempts.stream()
                    .filter(a -> a.getExam() != null && a.getExam().getType() == ExamType.READING && a.getOverallBand() != null)
                    .mapToDouble(StudentAttempt::getOverallBand)
                    .average()
                    .isPresent() ? Math.round(dayAttempts.stream()
                            .filter(a -> a.getExam() != null && a.getExam().getType() == ExamType.READING && a.getOverallBand() != null)
                            .mapToDouble(StudentAttempt::getOverallBand)
                            .average()
                            .getAsDouble() * 10.0) / 10.0 : null;

            Double listeningVal = dayAttempts.stream()
                    .filter(a -> a.getExam() != null && a.getExam().getType() == ExamType.LISTENING && a.getOverallBand() != null)
                    .mapToDouble(StudentAttempt::getOverallBand)
                    .average()
                    .isPresent() ? Math.round(dayAttempts.stream()
                            .filter(a -> a.getExam() != null && a.getExam().getType() == ExamType.LISTENING && a.getOverallBand() != null)
                            .mapToDouble(StudentAttempt::getOverallBand)
                            .average()
                            .getAsDouble() * 10.0) / 10.0 : null;

            Double writingVal = dayAttempts.stream()
                    .filter(a -> a.getExam() != null && a.getExam().getType() == ExamType.WRITING && a.getOverallBand() != null)
                    .mapToDouble(StudentAttempt::getOverallBand)
                    .average()
                    .isPresent() ? Math.round(dayAttempts.stream()
                            .filter(a -> a.getExam() != null && a.getExam().getType() == ExamType.WRITING && a.getOverallBand() != null)
                            .mapToDouble(StudentAttempt::getOverallBand)
                            .average()
                            .getAsDouble() * 10.0) / 10.0 : null;

            Double speakingVal = dayAttempts.stream()
                    .filter(a -> a.getExam() != null && a.getExam().getType() == ExamType.SPEAKING && a.getOverallBand() != null)
                    .mapToDouble(StudentAttempt::getOverallBand)
                    .average()
                    .isPresent() ? Math.round(dayAttempts.stream()
                            .filter(a -> a.getExam() != null && a.getExam().getType() == ExamType.SPEAKING && a.getOverallBand() != null)
                            .mapToDouble(StudentAttempt::getOverallBand)
                            .average()
                            .getAsDouble() * 10.0) / 10.0 : null;

            Double satVal = dayAttempts.stream()
                    .filter(a -> a.getExam() != null && a.getExam().getType() == ExamType.SAT && a.getTotalScore() != null)
                    .mapToDouble(StudentAttempt::getTotalScore)
                    .average()
                    .isPresent() ? (double) Math.round(dayAttempts.stream()
                            .filter(a -> a.getExam() != null && a.getExam().getType() == ExamType.SAT && a.getTotalScore() != null)
                            .mapToDouble(StudentAttempt::getTotalScore)
                            .average()
                            .getAsDouble()) : null;

            Double nationalCertVal = dayAttempts.stream()
                    .filter(a -> a.getExam() != null && a.getExam().getType() == ExamType.NATIONAL_CERT && a.getTotalScore() != null)
                    .mapToDouble(StudentAttempt::getTotalScore)
                    .average()
                    .isPresent() ? (double) Math.round(dayAttempts.stream()
                            .filter(a -> a.getExam() != null && a.getExam().getType() == ExamType.NATIONAL_CERT && a.getTotalScore() != null)
                            .mapToDouble(StudentAttempt::getTotalScore)
                            .average()
                            .getAsDouble()) : null;

            weeklyData.add(UserDashboardStatsDto.DailyDataDto.builder()
                    .day(dayName)
                    .minutes(mins)
                    .reading(readingVal)
                    .listening(listeningVal)
                    .writing(writingVal)
                    .speaking(speakingVal)
                    .sat(satVal)
                    .nationalCert(nationalCertVal)
                    .attemptsCount(dayAttempts.size())
                    .build());
        }

        int streak = 0;
        LocalDate checkToday = LocalDate.now();
        LocalDate yesterday = checkToday.minusDays(1);
        
        if (dailyMinutes.containsKey(checkToday) || dailyMinutes.containsKey(yesterday)) {
            LocalDate checkDate = dailyMinutes.containsKey(checkToday) ? checkToday : yesterday;
            int maxIterations = 366;
            while (maxIterations > 0) {
                Double mins = dailyMinutes.get(checkDate);
                if (mins == null || mins <= 0.0) {
                    break;
                }
                streak++;
                checkDate = checkDate.minusDays(1);
                maxIterations--;
            }
        }

        Long daysLeft = null;
        if (user.getExamDate() != null) {
            daysLeft = ChronoUnit.DAYS.between(LocalDate.now(), user.getExamDate());
            if (daysLeft < 0) daysLeft = 0L;
        }

        Double avgScore = attempts.stream()
                .filter(a -> a.getOverallBand() != null)
                .mapToDouble(StudentAttempt::getOverallBand)
                .average()
                .isPresent() ? Math.round(attempts.stream()
                        .filter(a -> a.getOverallBand() != null)
                        .mapToDouble(StudentAttempt::getOverallBand)
                        .average()
                        .getAsDouble() * 10.0) / 10.0 : null;

        Double totalMinutes = 0.0;
        // Sum practice minutes for current calendar week (Mon–Sun)
        for (int i = 0; i < 7; i++) {
            Double mins = dailyMinutes.get(monday.plusDays(i));
            if (mins != null) {
                totalMinutes += mins;
            }
        }
        Double targetBand = user.getTargetBand() != null ? user.getTargetBand() : 7.5;

        return ResponseEntity.ok(UserDashboardStatsDto.builder()
                .totalMinutes(totalMinutes)
                .streak(streak)
                .targetBand(targetBand)
                .avgScore(avgScore)
                .examDaysLeft(daysLeft)
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
        double speakingMinutes = sessions.stream().mapToDouble(s -> s.getMinutes() != null ? s.getMinutes() : 0.0).sum();

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
