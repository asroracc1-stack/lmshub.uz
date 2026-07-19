package com.lmscrm.backend.service.exam;

import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.domain.enums.ExamType;
import com.lmscrm.backend.dto.exam.StudentAttemptDto;
import com.lmscrm.backend.dto.exam.SubmitExamRequest;
import com.lmscrm.backend.exception.BusinessException;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.mapper.ExamMapper;
import com.lmscrm.backend.repository.*;
import com.lmscrm.backend.service.finance.CoinService;
import com.lmscrm.backend.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentAttemptService {

    private final StudentAttemptRepository attemptRepository;
    private final ExamRepository examRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository optionRepository;
    private final StudentAnswerRepository answerRepository;
    private final CoinService coinService;
    private final UserRepository userRepository;
    private final XpTransactionRepository xpTransactionRepository;
    private final ExamMapper mapper;
    private final SubscriptionService subscriptionService;
    private final PracticeSessionRepository practiceSessionRepository;

    @Transactional
    public StudentAttemptDto startExam(UUID examId, User student) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));

        if (!subscriptionService.hasMockAccess(student, exam)) {
            throw new BusinessException("Bu mock premium paket uchun mavjud");
        }

        if (!exam.getIsActive()) {
            throw new BusinessException("Exam is not active");
        }

        if (exam.getStartTime() != null && LocalDateTime.now().isBefore(exam.getStartTime())) {
            throw new BusinessException("Exam has not started yet");
        }

        if (exam.getEndTime() != null && LocalDateTime.now().isAfter(exam.getEndTime())) {
            throw new BusinessException("Exam has already ended");
        }

        java.util.Optional<StudentAttempt> existingOpt = attemptRepository.findByExamIdAndStudentId(examId, student.getId());
        if (existingOpt.isPresent()) {
            StudentAttempt existing = existingOpt.get();
            if (existing.getFinishedAt() == null) {
                // Resume existing attempt
                return mapper.toStudentAttemptDto(existing);
            } else {
                throw new BusinessException("You have already attempted this exam");
            }
        }

        String attemptSeed = java.util.UUID.randomUUID().toString();

        StudentAttempt attempt = StudentAttempt.builder()
                .exam(exam)
                .student(student)
                .startedAt(LocalDateTime.now())
                .attemptSeed(attemptSeed)
                .build();

        return mapper.toStudentAttemptDto(attemptRepository.save(attempt));
    }

    @Transactional
    public StudentAttemptDto submitExam(SubmitExamRequest request, User student) {
        StudentAttempt attempt = attemptRepository.findById(request.getAttemptId())
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found"));

        if (!attempt.getStudent().getId().equals(student.getId())) {
            throw new BusinessException("You can only submit your own attempt");
        }

        if (attempt.getFinishedAt() != null) {
            throw new BusinessException("Exam already submitted");
        }

        int totalScore = 0;
        int maxScore = 0;

        for (SubmitExamRequest.AnswerRequest ansRequest : request.getAnswers()) {
            Question question = questionRepository.findById(ansRequest.getQuestionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Question not found"));

            maxScore += question.getPoints();

            QuestionOption selectedOption = null;
            boolean isCorrect = false;
            int pointsEarned = 0;

            if (ansRequest.getSelectedOptionId() != null) {
                selectedOption = optionRepository.findById(ansRequest.getSelectedOptionId())
                        .orElseThrow(() -> new ResourceNotFoundException("Option not found"));
                isCorrect = selectedOption.getIsCorrect();
                if (isCorrect) {
                    pointsEarned = question.getPoints();
                    totalScore += pointsEarned;
                }
            }

            StudentAnswer answer = StudentAnswer.builder()
                    .attempt(attempt)
                    .question(question)
                    .selectedOption(selectedOption)
                    .isCorrect(isCorrect)
                    .pointsEarned(pointsEarned)
                    .build();

            answerRepository.save(answer);
        }

        attempt.setFinishedAt(LocalDateTime.now());
        attempt.setTotalScore(totalScore);
        attempt.setMaxScore(maxScore);

        boolean isPassed = totalScore >= attempt.getExam().getPassingScore();
        attempt.setIsPassed(isPassed);

        // Calculate and save practice session minutes based on exam attempt time
        int secondsUsed = attempt.getTimeUsedSeconds() != null ? attempt.getTimeUsedSeconds() : 0;
        if (secondsUsed == 0 && attempt.getStartedAt() != null) {
            secondsUsed = (int) java.time.Duration.between(attempt.getStartedAt(), attempt.getFinishedAt()).toSeconds();
            attempt.setTimeUsedSeconds(secondsUsed);
        }
        double minutesUsed = secondsUsed / 60.0;
        if (minutesUsed > 0.0) {
            PracticeSession session = PracticeSession.builder()
                    .user(student)
                    .minutes(Math.round(minutesUsed * 10.0) / 10.0)
                    .createdAt(attempt.getFinishedAt())
                    .build();
            practiceSessionRepository.save(session);
        }

        attemptRepository.save(attempt);

        // Analytics & Gamification
        analyzeProgressAndReward(attempt, isPassed);

        return mapper.toStudentAttemptDto(attempt);
    }

    private void analyzeProgressAndReward(StudentAttempt currentAttempt, boolean isPassed) {
        User student = currentAttempt.getStudent();
        Exam exam = currentAttempt.getExam();
        ExamType type = exam.getType();
        
        int correctAnswers = currentAttempt.getTotalScore() != null ? currentAttempt.getTotalScore() : 0;
        int totalQuestions = currentAttempt.getMaxScore() != null ? currentAttempt.getMaxScore() : 0;

        int coinReward = 0;
        String reason = "";

        if (type == ExamType.SAT || type == ExamType.MATH) {
            // Count R&W vs Math in answers
            List<StudentAnswer> answers = answerRepository.findByAttemptId(currentAttempt.getId());
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
            // National Certificate: out of 100 points
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
            // IELTS and others: scale to IELTS band 0 - 9.0
            double band = calculateIeltsBand(correctAnswers, totalQuestions, type);
            if (band >= 7.5) {
                coinReward = 10;
            } else if (band >= 6.5) {
                coinReward = 5;
            } else if (band >= 5.5) {
                coinReward = 3;
            }
            reason = String.format("IELTS Band %.1f/9.0", band);
        }

        if (coinReward > 0) {
            coinService.addCoins(student, coinReward, reason + " in " + exam.getTitle(), "EXAM_REWARD", null);
        } else if (isPassed) {
            // Fallback default passing reward if they passed but didn't reach threshold
            coinService.addCoins(student, 2, "Passed exam: " + exam.getTitle(), "EXAM_PASSED", null);
        }

        // Gamification: Give XP based on the exam type and performance
        long xpEarned = 100L; // Base XP for completing any exam
        if (type == ExamType.SAT || type == ExamType.MATH) {
            boolean isSingle = (totalQuestions < 60);
            List<StudentAnswer> answers = answerRepository.findByAttemptId(currentAttempt.getId());
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
            xpEarned += (long) (band * 30.0);
        }

        student.setXp((student.getXp() != null ? student.getXp() : 0L) + xpEarned);
        userRepository.save(student);

        // Record XP transaction
        XpTransaction xpTx = XpTransaction.builder()
                .user(student)
                .amount(xpEarned)
                .build();
        xpTransactionRepository.save(xpTx);

        // Simple Analytics: Compare with previous 5 attempts
        List<StudentAttempt> history = attemptRepository.findTop5ByStudentIdAndFinishedAtIsNotNullOrderByFinishedAtAsc(student.getId());
        if (history.size() > 1) {
            StudentAttempt previous = history.get(history.size() - 2); // get the one before current

            double currentPercentage = currentAttempt.getMaxScore() > 0 ? (double) currentAttempt.getTotalScore() / currentAttempt.getMaxScore() : 0.0;
            double previousPercentage = previous.getMaxScore() > 0 ? (double) previous.getTotalScore() / previous.getMaxScore() : 0.0;

            if (currentPercentage > previousPercentage + 0.1) { // 10% improvement
                log.info("Student {} showed great progress!", student.getEmail());
                coinService.addCoins(student, 5, "Great progress in exams", "PROGRESS_BONUS", null);
            }
        }
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
        } else { // Reading
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

    @Transactional(readOnly = true)
    public List<StudentAttemptDto> getMyAttempts(UUID studentId) {
        return attemptRepository.findByStudentIdOrderByStartedAtDesc(studentId).stream()
                .map(mapper::toStudentAttemptDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteAttempt(UUID examId, User student) {
        attemptRepository.findByExamIdAndStudentId(examId, student.getId())
                .ifPresent(attempt -> {
                    answerRepository.deleteByAttemptId(attempt.getId());
                    attemptRepository.delete(attempt);
                });
    }
}
