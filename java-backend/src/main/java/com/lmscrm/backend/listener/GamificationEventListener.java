package com.lmscrm.backend.listener;

import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.domain.enums.ExamType;
import com.lmscrm.backend.event.ExamSubmittedEvent;
import com.lmscrm.backend.repository.StudentAnswerRepository;
import com.lmscrm.backend.repository.StudentAttemptRepository;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.repository.XpTransactionRepository;
import com.lmscrm.backend.service.finance.CoinService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class GamificationEventListener {

    private final UserRepository userRepository;
    private final XpTransactionRepository xpTransactionRepository;
    private final CoinService coinService;
    private final StudentAttemptRepository attemptRepository;
    private final StudentAnswerRepository answerRepository;

    @EventListener
    @Async
    @Transactional
    public void onExamSubmitted(ExamSubmittedEvent event) {
        log.info("Processing asynchronous gamification rewards for student {}", event.getStudent().getEmail());
        
        StudentAttempt attempt = event.getAttempt();
        User student = event.getStudent();
        Exam exam = attempt.getExam();

        boolean alreadyRewarded = attemptRepository.findAttempts(exam.getId(), student.getId()).stream()
                .anyMatch(sa -> sa != null && !sa.getId().equals(attempt.getId()) && Boolean.TRUE.equals(sa.getRewardGranted()));

        if (alreadyRewarded || Boolean.TRUE.equals(attempt.getRewardGranted())) {
            log.info("Student {} was already rewarded for exam {}, skipping reward for retry attempt {}", 
                    student.getEmail(), exam.getTitle(), attempt.getId());
            return;
        }

        ExamType type = exam.getType();
        int correctAnswers = event.getCorrectAnswers();
        int totalQuestions = event.getTotalQuestions();
        boolean isPassed = event.isPassed();

        int coinReward = 0;
        String reason = "";

        if (type == ExamType.SAT || type == ExamType.MATH) {
            List<StudentAnswer> answers = answerRepository.findByAttemptId(attempt.getId());
            int rwCorrect = 0;
            int rwTotal = 0;
            int mathCorrect = 0;
            int mathTotal = 0;

            for (StudentAnswer answer : answers) {
                Question q = answer.getQuestion();
                String qtype = q.getQuestionType() != null ? q.getQuestionType() : "";
                String text = q.getText() != null ? q.getText() : "";

                boolean isMath = type == ExamType.MATH ||
                        qtype.toLowerCase().contains("math") ||
                        qtype.toLowerCase().contains("calcul") ||
                        qtype.toLowerCase().contains("algebra") ||
                        qtype.toLowerCase().contains("geometry") ||
                        qtype.toLowerCase().contains("trig") ||
                        text.contains("\\(") ||
                        text.contains("$$");

                if (isMath) {
                    mathTotal++;
                    if (Boolean.TRUE.equals(answer.getIsCorrect())) {
                        mathCorrect++;
                    }
                } else {
                    rwTotal++;
                    if (Boolean.TRUE.equals(answer.getIsCorrect())) {
                        rwCorrect++;
                    }
                }
            }

            if (rwTotal == 0 && mathTotal == 0) {
                double ratio = totalQuestions > 0 ? (double) correctAnswers / totalQuestions : 0.0;
                rwTotal = (int) Math.round((double) totalQuestions * 54 / 98);
                mathTotal = totalQuestions - rwTotal;
                rwCorrect = (int) Math.round(ratio * rwTotal);
                mathCorrect = correctAnswers - rwCorrect;
            }

            int rwScore = getRWScore(rwCorrect, rwTotal);
            int mathScore = getMathScore(mathCorrect, mathTotal);
            int finalScore = rwScore + mathScore;
            boolean isSingleSection = false;

            if (rwTotal > 0 && mathTotal == 0) {
                finalScore = rwScore;
                isSingleSection = true;
            } else if (mathTotal > 0 && rwTotal == 0) {
                finalScore = mathScore;
                isSingleSection = true;
            }

            if (isSingleSection) {
                if (finalScore >= 600) {
                    coinReward = 10;
                } else if (finalScore >= 500) {
                    coinReward = 5;
                } else if (finalScore >= 400) {
                    coinReward = 3;
                }
            } else {
                if (finalScore >= 1200) {
                    coinReward = 10;
                } else if (finalScore >= 1000) {
                    coinReward = 5;
                } else if (finalScore >= 800) {
                    coinReward = 3;
                }
            }
            reason = String.format("SAT scaled score %d/%s", finalScore, isSingleSection ? "800" : "1600");

        } else if (type == ExamType.NATIONAL_CERT || type == ExamType.GENERAL) {
            int finalScore = totalQuestions > 0 ? Math.round(((float) correctAnswers / totalQuestions) * 100) : 0;
            if (finalScore >= 75) {
                coinReward = 10;
            } else if (finalScore >= 63) {
                coinReward = 5;
            } else if (finalScore >= 50) {
                coinReward = 3;
            }
            reason = String.format("Milliy Sertifikat score %d/100", finalScore);

        } else {
            double band = calculateIeltsBand(correctAnswers, totalQuestions, type);
            coinReward = 5;
            reason = String.format("IELTS Band %.1f/9.0", band);
        }

        if (coinReward > 0) {
            coinService.addCoins(student, coinReward, reason + " in " + exam.getTitle(), "EXAM_REWARD", null);
        } else if (isPassed) {
            coinService.addCoins(student, 2, "Passed exam: " + exam.getTitle(), "EXAM_PASSED", null);
        }

        // Calculate XP
        long xpEarned = 100L;
        if (type == ExamType.SAT || type == ExamType.MATH) {
            boolean isSingle = (totalQuestions < 60);
            List<StudentAnswer> answers = answerRepository.findByAttemptId(attempt.getId());
            int rwCorrect = 0;
            int rwTotal = 0;
            int mathCorrect = 0;
            int mathTotal = 0;
            for (StudentAnswer answer : answers) {
                Question q = answer.getQuestion();
                String qtype = q.getQuestionType() != null ? q.getQuestionType() : "";
                String text = q.getText() != null ? q.getText() : "";
                boolean isMath = type == ExamType.MATH ||
                        qtype.toLowerCase().contains("math") ||
                        qtype.toLowerCase().contains("calcul") ||
                        text.contains("\\(") || text.contains("$$");
                if (isMath) {
                    mathTotal++;
                    if (Boolean.TRUE.equals(answer.getIsCorrect())) mathCorrect++;
                } else {
                    rwTotal++;
                    if (Boolean.TRUE.equals(answer.getIsCorrect())) rwCorrect++;
                }
            }
            if (rwTotal == 0 && mathTotal == 0) {
                double ratio = totalQuestions > 0 ? (double) correctAnswers / totalQuestions : 0.0;
                rwTotal = (int) Math.round((double) totalQuestions * 54 / 98);
                mathTotal = totalQuestions - rwTotal;
                rwCorrect = (int) Math.round(ratio * rwTotal);
                mathCorrect = correctAnswers - rwCorrect;
            }
            int rwScore = getRWScore(rwCorrect, rwTotal);
            int mathScore = getMathScore(mathCorrect, mathTotal);
            int finalScore = rwScore + mathScore;
            if (rwTotal > 0 && mathTotal == 0) {
                finalScore = rwScore;
            } else if (mathTotal > 0 && rwTotal == 0) {
                finalScore = mathScore;
            }
            xpEarned += (long) ((finalScore - (isSingle ? 200 : 400)) * 0.5);
        } else if (type == ExamType.NATIONAL_CERT || type == ExamType.GENERAL) {
            int finalScore = totalQuestions > 0 ? Math.round(((float) correctAnswers / totalQuestions) * 100) : 0;
            xpEarned += finalScore * 3L;
        } else {
            double band = calculateIeltsBand(correctAnswers, totalQuestions, type);
            xpEarned = 5L + (long) (band * 30.0);
        }

        student.setXp((student.getXp() != null ? student.getXp() : 0L) + xpEarned);
        userRepository.save(student);

        XpTransaction xpTx = XpTransaction.builder()
                .user(student)
                .amount(xpEarned)
                .build();
        xpTransactionRepository.save(xpTx);

        // Progress check
        List<StudentAttempt> history = attemptRepository.findTop5ByStudentIdAndFinishedAtIsNotNullOrderByFinishedAtAsc(student.getId());
        if (history.size() > 1) {
            StudentAttempt previous = history.get(history.size() - 2);
            double currentPercentage = attempt.getMaxScore() > 0 ? (double) attempt.getTotalScore() / attempt.getMaxScore() : 0.0;
            double previousPercentage = previous.getMaxScore() > 0 ? (double) previous.getTotalScore() / previous.getMaxScore() : 0.0;

            if (currentPercentage > previousPercentage + 0.1) {
                coinService.addCoins(student, 5, "Great progress in exams", "PROGRESS_BONUS", null);
            }
        }

        attempt.setRewardGranted(true);
        attemptRepository.save(attempt);
    }

    private int getRWScore(int correctCount, int totalCount) {
        if (totalCount == 0) return 200;
        int scaledCorrect = (int) Math.round((double) correctCount / totalCount * 54);
        int[] table = {
                200, 205, 210, 220, 240, 260, 280, 300, 320, 340, 350, 360, 370, 380, 390, 400,
                410, 420, 430, 440, 450, 460, 470, 480, 490, 500, 510, 520, 530, 540, 550, 560,
                570, 580, 590, 600, 610, 620, 630, 640, 650, 660, 670, 680, 690, 700, 710, 720,
                730, 740, 760, 770, 780, 790, 800
        };
        if (scaledCorrect < 0) return 200;
        if (scaledCorrect >= table.length) return 800;
        return table[scaledCorrect];
    }

    private int getMathScore(int correctCount, int totalCount) {
        if (totalCount == 0) return 200;
        int scaledCorrect = (int) Math.round((double) correctCount / totalCount * 44);
        int[] table = {
                200, 220, 240, 265, 290, 320, 350, 370, 390, 410, 430, 450, 460, 470, 480, 490,
                500, 510, 520, 535, 540, 550, 560, 570, 580, 590, 600, 610, 620, 630, 640, 650,
                660, 670, 680, 690, 700, 720, 730, 740, 750, 770, 780, 790, 800
        };
        if (scaledCorrect < 0) return 200;
        if (scaledCorrect >= table.length) return 800;
        return table[scaledCorrect];
    }

    private double calculateIeltsBand(int correct, int total, ExamType type) {
        if (total == 0) return 0.0;
        int scaledRaw = (int) Math.round(((double) correct / total) * 40);
        if (type == ExamType.LISTENING) {
            if (scaledRaw >= 39) return 9.0;
            if (scaledRaw >= 37) return 8.5;
            if (scaledRaw >= 35) return 8.0;
            if (scaledRaw >= 32) return 7.5;
            if (scaledRaw >= 30) return 7.0;
            if (scaledRaw >= 26) return 6.5;
            if (scaledRaw >= 23) return 6.0;
            if (scaledRaw >= 18) return 5.5;
            if (scaledRaw >= 16) return 5.0;
            if (scaledRaw >= 13) return 4.5;
            if (scaledRaw >= 10) return 4.0;
            if (scaledRaw >= 8) return 3.5;
            if (scaledRaw >= 6) return 3.0;
            if (scaledRaw >= 4) return 2.5;
            return 2.0;
        } else {
            if (scaledRaw >= 39) return 9.0;
            if (scaledRaw >= 37) return 8.5;
            if (scaledRaw >= 35) return 8.0;
            if (scaledRaw >= 33) return 7.5;
            if (scaledRaw >= 30) return 7.0;
            if (scaledRaw >= 27) return 6.5;
            if (scaledRaw >= 23) return 6.0;
            if (scaledRaw >= 19) return 5.5;
            if (scaledRaw >= 15) return 5.0;
            if (scaledRaw >= 13) return 4.5;
            if (scaledRaw >= 10) return 4.0;
            if (scaledRaw >= 8) return 3.5;
            if (scaledRaw >= 6) return 3.0;
            if (scaledRaw >= 4) return 2.5;
            return 2.0;
        }
    }
}
