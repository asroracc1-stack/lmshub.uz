package com.lmscrm.backend.service.exam;

import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.dto.exam.StudentAttemptDto;
import com.lmscrm.backend.dto.exam.SubmitExamRequest;
import com.lmscrm.backend.exception.BusinessException;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.mapper.ExamMapper;
import com.lmscrm.backend.repository.*;
import com.lmscrm.backend.service.finance.CoinService;
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
    private final ExamMapper mapper;

    @Transactional
    public StudentAttemptDto startExam(UUID examId, User student) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));

        if (!exam.getIsActive()) {
            throw new BusinessException("Exam is not active");
        }

        if (exam.getStartTime() != null && LocalDateTime.now().isBefore(exam.getStartTime())) {
            throw new BusinessException("Exam has not started yet");
        }

        if (exam.getEndTime() != null && LocalDateTime.now().isAfter(exam.getEndTime())) {
            throw new BusinessException("Exam has already ended");
        }

        if (attemptRepository.findByExamIdAndStudentId(examId, student.getId()).isPresent()) {
            throw new BusinessException("You have already attempted this exam");
        }

        StudentAttempt attempt = StudentAttempt.builder()
                .exam(exam)
                .student(student)
                .startedAt(LocalDateTime.now())
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

        attemptRepository.save(attempt);

        // Analytics & Gamification
        analyzeProgressAndReward(attempt, isPassed);

        return mapper.toStudentAttemptDto(attempt);
    }

    private void analyzeProgressAndReward(StudentAttempt currentAttempt, boolean isPassed) {
        User student = currentAttempt.getStudent();

        // Gamification: Give coins for passing
        if (isPassed) {
            coinService.addCoins(student, 100, "Passed exam: " + currentAttempt.getExam().getTitle(), "EXAM_PASSED", null);
        }

        // Simple Analytics: Compare with previous 5 attempts
        List<StudentAttempt> history = attemptRepository.findTop5ByStudentIdAndFinishedAtIsNotNullOrderByFinishedAtAsc(student.getId());
        if (history.size() > 1) {
            StudentAttempt previous = history.get(history.size() - 2); // get the one before current

            double currentPercentage = (double) currentAttempt.getTotalScore() / currentAttempt.getMaxScore();
            double previousPercentage = (double) previous.getTotalScore() / previous.getMaxScore();

            if (currentPercentage > previousPercentage + 0.1) { // 10% improvement
                log.info("Student {} showed great progress!", student.getEmail());
                coinService.addCoins(student, 50, "Great progress in exams", "PROGRESS_BONUS", null);
            }
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
