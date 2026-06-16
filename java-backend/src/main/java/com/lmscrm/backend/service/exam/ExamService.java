package com.lmscrm.backend.service.exam;

import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.domain.enums.ExamType;
import com.lmscrm.backend.dto.exam.*;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.mapper.ExamMapper;
import com.lmscrm.backend.service.GeminiService;
import com.lmscrm.backend.repository.*;
import com.lmscrm.backend.util.IeltsGradingUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExamService {

    private final ExamRepository examRepository;
    private final PassageRepository passageRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository optionRepository;
    private final OrganizationRepository organizationRepository;
    private final StudentAttemptRepository studentAttemptRepository;
    private final StudentAnswerRepository studentAnswerRepository;
    private final ExamMapper mapper;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "examDetails", key = "#examId")
    public ExamDto getExamDetails(UUID examId) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + examId));

        ExamDto dto = mapper.toExamDto(exam);

        // Har bir passage uchun questions + options ni yuklash
        List<Passage> passages = passageRepository.findByExamIdOrderByPositionOrderAsc(examId);

        List<com.lmscrm.backend.dto.exam.PassageDto> passageDtos = passages.stream().map(passage -> {
            com.lmscrm.backend.dto.exam.PassageDto pDto = mapper.toPassageDto(passage);

            List<Question> questions = questionRepository.findByPassageIdOrderByPositionOrderAsc(passage.getId());

            List<QuestionDto> questionDtos = questions.stream().map(q -> {
                QuestionDto qDto = mapper.toQuestionDto(q);

                List<QuestionOption> options = optionRepository.findByQuestionIdOrderByPositionOrderAsc(q.getId());

                // correctAnswer: isCorrect=true bo'lgan option text sini olish
                String correctAnswer = options.stream()
                        .filter(QuestionOption::getIsCorrect)
                        .map(QuestionOption::getText)
                        .findFirst()
                        .orElse(null);
                qDto.setCorrectAnswer(correctAnswer);

                // Options listini set qilish (isCorrect ma'lumoti bor)
                List<com.lmscrm.backend.dto.exam.QuestionOptionDto> optDtos = options.stream()
                        .map(mapper::toQuestionOptionDto)
                        .collect(Collectors.toList());
                qDto.setOptions(optDtos);

                return qDto;
            }).collect(Collectors.toList());

            pDto.setQuestions(questionDtos);
            return pDto;
        }).collect(Collectors.toList());

        dto.setPassages(passageDtos);
        return dto;
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "examsByType", key = "#type")
    public List<QuestionDto> getExamQuestions(UUID examId, boolean excludeCorrectAnswers) {
        List<Question> questions = questionRepository.findByExamIdOrderByPositionOrderAsc(examId);

        return questions.stream().map(q -> {
            QuestionDto dto = mapper.toQuestionDto(q);
            List<QuestionOption> options = optionRepository.findByQuestionIdOrderByPositionOrderAsc(q.getId());

            List<QuestionOptionDto> optionDtos = options.stream().map(o -> {
                QuestionOptionDto odto = mapper.toQuestionOptionDto(o);
                if (excludeCorrectAnswers) {
                    odto.setIsCorrect(null); // Hide from students!
                }
                return odto;
            }).collect(Collectors.toList());

            dto.setOptions(optionDtos);
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional
    public ExamDto createMockExam(CreateExamRequest request, User author) {
        Organization org = null;
        if (author.getOrganizationId() != null) {
            org = organizationRepository.findById(author.getOrganizationId())
                    .orElse(null);
        }

        String finalTitle = request.getTitle();
        while (examRepository.existsByTitle(finalTitle)) {
            finalTitle = request.getTitle() + " (" + new java.util.Random().nextInt(1000) + ")";
        }

        Exam exam = Exam.builder()
                .title(finalTitle)
                .description(request.getDescription())
                .difficulty(request.getDifficulty() != null ? request.getDifficulty().toUpperCase() : "MEDIUM")
                .audioUrl(request.getAudioUrl())
                .pdfUrl(request.getPdfUrl())
                .type(ExamType.valueOf(request.getType().toUpperCase()))
                .durationMinutes(request.getDurationMinutes() != null ? request.getDurationMinutes() : 60)
                .passingScore(request.getPassingScore() != null ? request.getPassingScore() : 50)
                .requiredPack(request.getRequiredPack() != null ? request.getRequiredPack().toLowerCase() : "free")
                .organization(org)
                .createdBy(author)
                .isActive(true)
                .build();
        exam = examRepository.save(exam);

        saveSections(request, exam);
        
        return mapper.toExamDto(exam);
    }

    @Transactional
    public ExamDto updateMockExam(UUID examId, CreateExamRequest request) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + examId));

        exam.setTitle(request.getTitle());
        exam.setDescription(request.getDescription());
        exam.setDifficulty(request.getDifficulty() != null ? request.getDifficulty().toUpperCase() : "MEDIUM");
        exam.setAudioUrl(request.getAudioUrl());
        exam.setPdfUrl(request.getPdfUrl());
        exam.setDurationMinutes(request.getDurationMinutes() != null ? request.getDurationMinutes() : 60);
        exam.setPassingScore(request.getPassingScore() != null ? request.getPassingScore() : 50);
        exam.setRequiredPack(request.getRequiredPack() != null ? request.getRequiredPack().toLowerCase() : "free");

        // Clear existing passages to trigger orphanRemoval
        if (exam.getPassages() != null) {
            exam.getPassages().clear();
        } else {
            exam.setPassages(new java.util.ArrayList<>());
        }

        // Flush to ensure deletions are executed before adding new ones
        examRepository.saveAndFlush(exam);

        saveSections(request, exam);

        return mapper.toExamDto(examRepository.save(exam));
    }

    private void saveSections(CreateExamRequest request, Exam exam) {
        if (request.getSections() != null) {
            int passageOrder = 1;
            for (CreateExamRequest.SectionDto sectionDto : request.getSections()) {
                Passage passage = Passage.builder()
                        .exam(exam)
                        .title(sectionDto.getTitle() != null ? sectionDto.getTitle() : "Passage " + passageOrder)
                        .content(sectionDto.getPassage() != null ? sectionDto.getPassage() : "")
                        .imageUrl(sectionDto.getImageUrl())
                        .positionOrder(passageOrder++)
                        .questions(new java.util.ArrayList<>())
                        .build();
                
                // Add to exam's collection for proper JPA management
                if (exam.getPassages() != null) {
                    exam.getPassages().add(passage);
                }
                
                passage = passageRepository.save(passage);

                if (sectionDto.getQuestions() != null) {
                    int qOrder = 1;
                    for (CreateExamRequest.QuestionDto qDto : sectionDto.getQuestions()) {
                        Question q = Question.builder()
                                .exam(exam)
                                .passage(passage)
                                .text(qDto.getPrompt())
                                .questionType(qDto.getQtype())
                                .points(qDto.getPoints() != null ? qDto.getPoints() : 1)
                                .imageUrl(qDto.getImageUrl())
                                .imagePosition(qDto.getImagePosition() != null ? qDto.getImagePosition() : "top")
                                .positionOrder(qOrder++)
                                .explanation(qDto.getExplanation())
                                .options(new java.util.ArrayList<>())
                                .build();
                        
                        // Add to passage's collection
                        passage.getQuestions().add(q);
                        
                        q = questionRepository.save(q);

                        if (qDto.getOptions() != null && !qDto.getOptions().isEmpty()) {
                            int optOrder = 1;
                            for (CreateExamRequest.OptionDto optDto : qDto.getOptions()) {
                                QuestionOption opt = QuestionOption.builder()
                                        .question(q)
                                        .text(optDto.getText())
                                        .isCorrect(optDto.getIsCorrect() != null && optDto.getIsCorrect())
                                        .imageUrl(optDto.getImageUrl())
                                        .imagePosition(optDto.getImagePosition() != null ? optDto.getImagePosition() : "left")
                                        .positionOrder(optOrder++)
                                        .build();
                                
                                if (q.getOptions() != null) q.getOptions().add(opt);
                                optionRepository.save(opt);
                            }
                        }
                    }
                }
            }
        }
    }

    @Transactional(readOnly = true)
    public List<ExamDto> getAllExams() {
        return examRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"))
                .stream().map(mapper::toExamDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ExamDto> getExamsByType(String type) {
        ExamType examType = ExamType.valueOf(type.toUpperCase());
        return examRepository.findByTypeOrderByCreatedAtDesc(examType)
                .stream().map(mapper::toExamDto).collect(Collectors.toList());
    }

    @Transactional
    public void deleteExam(UUID id) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));
        examRepository.delete(exam);
    }

    @Transactional
    public ExamResultDto submitExam(ExamSubmitRequest request, User user) {
        Exam exam = examRepository.findById(request.getExam_id())
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + request.getExam_id()));

        List<Question> questions = questionRepository.findByExamIdOrderByPositionOrderAsc(exam.getId());
        List<ExamResultDto.QuestionDetail> details = new ArrayList<>();
        int correctCount = 0;
        
        long totalTimeSpent = 0;
        if (request.getTime_spent() != null) {
            totalTimeSpent = request.getTime_spent().values().stream().mapToLong(Long::longValue).sum();
        }

        for (Question q : questions) {
            String userAns = request.getAnswers().get(q.getId().toString());
            Long timeSpent = request.getTime_spent() != null ? request.getTime_spent().getOrDefault(q.getId().toString(), 0L) : 0L;
            
            // Get correct answer from options
            List<QuestionOption> options = optionRepository.findByQuestionIdOrderByPositionOrderAsc(q.getId());
            String correctAns = options.stream()
                    .filter(QuestionOption::getIsCorrect)
                    .map(QuestionOption::getText)
                    .findFirst()
                    .orElse("");

            boolean ok = IeltsGradingUtils.checkAnswer(userAns, correctAns);
            if (ok) correctCount += q.getPoints();

            details.add(ExamResultDto.QuestionDetail.builder()
                    .questionId(q.getId().toString())
                    .userAns(userAns != null ? userAns : "")
                    .correctAns(correctAns)
                    .ok(ok)
                    .timeSpentSeconds(timeSpent.intValue())
                    .build());
        }

        String kind = exam.getType().name().toLowerCase();
        double band = IeltsGradingUtils.rawToBand(kind, correctCount, questions.size());
        
        String aiCoachFeedback = null;
        String predictedScore = null;
        JsonNode explanationsNode = null;
        
        try {
            // Build JSON for Gemini
            java.util.Map<String, Object> examDataMap = new java.util.HashMap<>();
            examDataMap.put("examTitle", exam.getTitle());
            examDataMap.put("examType", kind);
            List<java.util.Map<String, Object>> qDataList = new java.util.ArrayList<>();
            for(ExamResultDto.QuestionDetail d : details) {
                java.util.Map<String, Object> qm = new java.util.HashMap<>();
                qm.put("questionId", d.getQuestionId());
                Question qEntity = questions.stream().filter(x -> x.getId().toString().equals(d.getQuestionId())).findFirst().orElse(null);
                qm.put("prompt", qEntity != null ? qEntity.getText() : "");
                qm.put("userAnswer", d.getUserAns());
                qm.put("correctAnswer", d.getCorrectAns());
                qm.put("isCorrect", d.isOk());
                qDataList.add(qm);
            }
            examDataMap.put("questions", qDataList);
            
            String examDataJson = objectMapper.writeValueAsString(examDataMap);
            String reviewResult = geminiService.generateExamReview(examDataJson);
            
            if (reviewResult != null) {
                JsonNode root = objectMapper.readTree(reviewResult);
                if (root.has("coachFeedback")) {
                    aiCoachFeedback = objectMapper.writeValueAsString(root.get("coachFeedback"));
                }
                if (root.has("predictedScore")) {
                    predictedScore = root.get("predictedScore").asText();
                }
                if (root.has("explanations")) {
                    explanationsNode = root.get("explanations");
                    // populate details with explanations
                    for (ExamResultDto.QuestionDetail d : details) {
                        if (explanationsNode.has(d.getQuestionId())) {
                            d.setAiExplanation(explanationsNode.get(d.getQuestionId()).asText());
                        }
                    }
                }
            }
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(ExamService.class).error("Failed to generate AI review: ", e);
        }

        if (user != null) {
            java.util.Optional<StudentAttempt> attemptOpt = studentAttemptRepository.findByExamIdAndStudentId(exam.getId(), user.getId());
            StudentAttempt attempt;
            if (attemptOpt.isPresent()) {
                attempt = attemptOpt.get();
                studentAnswerRepository.deleteByAttemptId(attempt.getId());
            } else {
                attempt = new StudentAttempt();
                attempt.setExam(exam);
                attempt.setStudent(user);
            }
            attempt.setStartedAt(java.time.LocalDateTime.now().minusMinutes(exam.getDurationMinutes() != null ? exam.getDurationMinutes() : 60));
            attempt.setFinishedAt(java.time.LocalDateTime.now());
            attempt.setTotalScore(correctCount);
            attempt.setMaxScore(questions.size());
            attempt.setIsPassed(correctCount >= exam.getPassingScore());
            attempt.setOverallBand(band);
            attempt.setTimeUsedSeconds((int) totalTimeSpent);
            attempt.setAiCoachFeedback(aiCoachFeedback);
            attempt.setPredictedScore(predictedScore);
            attempt.setAutoSubmitted(request.getAuto_submitted() != null ? request.getAuto_submitted() : false);
            attempt = studentAttemptRepository.save(attempt);

            if (request.getViolations() != null && !request.getViolations().isEmpty()) {
                for (ExamViolationDto vDto : request.getViolations()) {
                    ExamViolation v = ExamViolation.builder()
                            .attempt(attempt)
                            .violationType(vDto.getViolationType())
                            .timestamp(vDto.getTimestamp() != null ? java.time.LocalDateTime.parse(vDto.getTimestamp()) : java.time.LocalDateTime.now())
                            .details(vDto.getDetails())
                            .build();
                    attempt.getViolations().add(v);
                }
                studentAttemptRepository.save(attempt);
            }

            for (Question q : questions) {
                String userAns = request.getAnswers().get(q.getId().toString());
                List<QuestionOption> options = optionRepository.findByQuestionIdOrderByPositionOrderAsc(q.getId());
                Long timeSpent = request.getTime_spent() != null ? request.getTime_spent().getOrDefault(q.getId().toString(), 0L) : 0L;
                String aiExpl = explanationsNode != null && explanationsNode.has(q.getId().toString()) ? explanationsNode.get(q.getId().toString()).asText() : null;
                
                QuestionOption selectedOption = null;
                if (userAns != null && !userAns.trim().isEmpty()) {
                    selectedOption = options.stream()
                            .filter(o -> o.getText().equalsIgnoreCase(userAns.trim()))
                            .findFirst()
                            .orElse(null);
                }

                String correctAns = options.stream()
                        .filter(QuestionOption::getIsCorrect)
                        .map(QuestionOption::getText)
                        .findFirst()
                        .orElse("");
                boolean isCorrect = IeltsGradingUtils.checkAnswer(userAns, correctAns);

                StudentAnswer answer = StudentAnswer.builder()
                        .attempt(attempt)
                        .question(q)
                        .selectedOption(selectedOption)
                        .userAnswerText(userAns)
                        .isCorrect(isCorrect)
                        .pointsEarned(isCorrect ? q.getPoints() : 0)
                        .timeSpentSeconds(timeSpent.intValue())
                        .aiExplanation(aiExpl)
                        .build();
                studentAnswerRepository.save(answer);
            }
        }

        return ExamResultDto.builder()
                .kind(kind)
                .correct(correctCount)
                .total(questions.size())
                .bandScore(band)
                .detail(details)
                .timeUsedSeconds((int)totalTimeSpent)
                .aiCoachFeedback(aiCoachFeedback)
                .predictedScore(predictedScore)
                .autoSubmitted(request.getAuto_submitted())
                .violations(request.getViolations())
                .build();
    }

    @Transactional(readOnly = true)
    public ExamResultDto getExamResult(UUID examId, User student) {
        StudentAttempt attempt = studentAttemptRepository.findByExamIdAndStudentId(examId, student.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No attempt found for this exam"));

        List<Question> questions = questionRepository.findByExamIdOrderByPositionOrderAsc(examId);
        List<StudentAnswer> answers = studentAnswerRepository.findByAttemptId(attempt.getId());
        java.util.Map<UUID, StudentAnswer> answerMap = answers.stream()
                .collect(Collectors.toMap(a -> a.getQuestion().getId(), a -> a));

        List<ExamResultDto.QuestionDetail> details = new ArrayList<>();
        int correctCount = 0;

        for (Question q : questions) {
            StudentAnswer answer = answerMap.get(q.getId());
            String userAns = "";
            boolean ok = false;
            Integer timeSpent = 0;
            String aiExpl = null;
            if (answer != null) {
                userAns = answer.getUserAnswerText() != null ? answer.getUserAnswerText() : (answer.getSelectedOption() != null ? answer.getSelectedOption().getText() : "");
                ok = answer.getIsCorrect() != null && answer.getIsCorrect();
                correctCount += (answer.getPointsEarned() != null) ? answer.getPointsEarned() : 0;
                timeSpent = answer.getTimeSpentSeconds() != null ? answer.getTimeSpentSeconds() : 0;
                aiExpl = answer.getAiExplanation();
            }

            List<QuestionOption> options = optionRepository.findByQuestionIdOrderByPositionOrderAsc(q.getId());
            String correctAns = options.stream()
                    .filter(QuestionOption::getIsCorrect)
                    .map(QuestionOption::getText)
                    .findFirst()
                    .orElse("");

            details.add(ExamResultDto.QuestionDetail.builder()
                    .questionId(q.getId().toString())
                    .userAns(userAns)
                    .correctAns(correctAns)
                    .ok(ok)
                    .timeSpentSeconds(timeSpent)
                    .aiExplanation(aiExpl)
                    .build());
        }

        String kind = attempt.getExam().getType().name().toLowerCase();
        
        return ExamResultDto.builder()
                .kind(kind)
                .correct(attempt.getTotalScore() != null ? attempt.getTotalScore() : correctCount)
                .total(attempt.getMaxScore() != null ? attempt.getMaxScore() : questions.size())
                .bandScore(attempt.getOverallBand() != null ? attempt.getOverallBand() : 0.0)
                .detail(details)
                .timeUsedSeconds(attempt.getTimeUsedSeconds() != null ? attempt.getTimeUsedSeconds() : 0)
                .aiCoachFeedback(attempt.getAiCoachFeedback())
                .predictedScore(attempt.getPredictedScore())
                .autoSubmitted(attempt.getAutoSubmitted() != null ? attempt.getAutoSubmitted() : false)
                .violations(attempt.getViolations().stream().map(v -> ExamViolationDto.builder()
                        .violationType(v.getViolationType())
                        .timestamp(v.getTimestamp().toString())
                        .details(v.getDetails())
                        .build()).collect(Collectors.toList()))
                .build();
    }
}
