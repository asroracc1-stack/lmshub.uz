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
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
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
    private final PracticeSessionRepository practiceSessionRepository;
    private final ExamMapper mapper;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;
    private final com.lmscrm.backend.service.SubscriptionService subscriptionService;
    private final DbStoredFileRepository dbStoredFileRepository;
    private final com.lmscrm.backend.service.AuditLogService auditLogService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final com.lmscrm.backend.service.exam.scoring.AnswerVerificationEngine answerVerificationEngine;

    private final String uploadDir = "uploads/";

    @PersistenceContext
    private EntityManager entityManager;

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
    public List<QuestionDto> getExamQuestions(UUID examId, User user, boolean excludeCorrectAnswers) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + examId));

        if (user != null && !subscriptionService.hasMockAccess(user, exam)) {
            throw new com.lmscrm.backend.exception.BusinessException("Bu mock premium paket uchun mavjud");
        }

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

        String status = (request.getStatus() != null) ? request.getStatus().toUpperCase() : "DRAFT";
        if ("PUBLISHED".equals(status) && !author.getRole().name().equals("SUPER_ADMIN")) {
            throw new com.lmscrm.backend.exception.BusinessException("Faqat Super Admin nashr eta oladi!");
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
                .status(status)
                .subType(request.getSubType() != null ? request.getSubType().toUpperCase() : null)
                .isAiImported(request.getIsAiImported() != null ? request.getIsAiImported() : false)
                .publishedAt("PUBLISHED".equals(status) ? java.time.LocalDateTime.now() : null)
                .build();
        exam = examRepository.save(exam);

        saveSections(request, exam);
        
        return mapper.toExamDto(exam);
    }

    @Transactional
    public ExamDto updateMockExam(UUID examId, CreateExamRequest request, User author) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + examId));

        String newStatus = request.getStatus() != null ? request.getStatus().toUpperCase() : "DRAFT";
        if ("PUBLISHED".equals(newStatus) && !"PUBLISHED".equals(exam.getStatus())) {
            if (!author.getRole().name().equals("SUPER_ADMIN")) {
                throw new com.lmscrm.backend.exception.BusinessException("Faqat Super Admin nashr eta oladi!");
            }
        }

        exam.setTitle(request.getTitle());
        exam.setDescription(request.getDescription());
        exam.setDifficulty(request.getDifficulty() != null ? request.getDifficulty().toUpperCase() : "MEDIUM");
        exam.setAudioUrl(request.getAudioUrl());
        exam.setPdfUrl(request.getPdfUrl());
        exam.setDurationMinutes(request.getDurationMinutes() != null ? request.getDurationMinutes() : 60);
        exam.setPassingScore(request.getPassingScore() != null ? request.getPassingScore() : 50);
        exam.setRequiredPack(request.getRequiredPack() != null ? request.getRequiredPack().toLowerCase() : "free");

        exam.setStatus(newStatus);
        if ("PUBLISHED".equals(newStatus) && exam.getPublishedAt() == null) {
            exam.setPublishedAt(java.time.LocalDateTime.now());
        }
        if (request.getSubType() != null) {
            exam.setSubType(request.getSubType().toUpperCase());
        }
        if (request.getIsAiImported() != null) {
            exam.setIsAiImported(request.getIsAiImported());
        }

        updateSections(request, exam);

        return mapper.toExamDto(examRepository.save(exam));
    }

    private void updateSections(CreateExamRequest request, Exam exam) {
        List<Passage> existingPassages = exam.getPassages();
        if (existingPassages == null) {
            existingPassages = new java.util.ArrayList<>();
            exam.setPassages(existingPassages);
        }

        List<CreateExamRequest.SectionDto> incomingSections = request.getSections();
        if (incomingSections == null) {
            incomingSections = new java.util.ArrayList<>();
        }

        List<Passage> passagesToRemove = new java.util.ArrayList<>();
        
        for (int i = 0; i < incomingSections.size(); i++) {
            CreateExamRequest.SectionDto sectionDto = incomingSections.get(i);
            int passageOrder = i + 1;
            
            Passage passage;
            if (i < existingPassages.size()) {
                passage = existingPassages.get(i);
                passage.setTitle(sectionDto.getTitle() != null ? sectionDto.getTitle() : "Section " + passageOrder);
                passage.setContent(sectionDto.getPassage() != null ? sectionDto.getPassage() : "");
                passage.setImageUrl(sectionDto.getImageUrl());
                passage.setPositionOrder(passageOrder);
                passage.setAudioUrl(sectionDto.getAudioUrl());
                passage.setPdfAttachment(sectionDto.getPdfAttachment());
                passage.setTimeLimitSeconds(sectionDto.getTimeLimitSeconds());
                passage.setShuffleQuestions(sectionDto.getShuffleQuestions() != null && sectionDto.getShuffleQuestions());
                passage.setShuffleOptions(sectionDto.getShuffleOptions() != null && sectionDto.getShuffleOptions());
                passage.setAutoNumbering(sectionDto.getAutoNumbering() != null ? sectionDto.getAutoNumbering() : true);
                passage.setLockNavigation(sectionDto.getLockNavigation() != null && sectionDto.getLockNavigation());
                passage.setQuestionRandomization(sectionDto.getQuestionRandomization() != null && sectionDto.getQuestionRandomization());
                passage.setIcon(sectionDto.getIcon());
                passage.setColorTheme(sectionDto.getColorTheme());
                passage.setInstructions(sectionDto.getInstructions());
                passage.setDifficulty(sectionDto.getDifficulty());
                passage.setPassingScore(sectionDto.getPassingScore());
            } else {
                passage = Passage.builder()
                        .exam(exam)
                        .title(sectionDto.getTitle() != null ? sectionDto.getTitle() : "Section " + passageOrder)
                        .content(sectionDto.getPassage() != null ? sectionDto.getPassage() : "")
                        .imageUrl(sectionDto.getImageUrl())
                        .positionOrder(passageOrder)
                        .audioUrl(sectionDto.getAudioUrl())
                        .pdfAttachment(sectionDto.getPdfAttachment())
                        .timeLimitSeconds(sectionDto.getTimeLimitSeconds())
                        .shuffleQuestions(sectionDto.getShuffleQuestions() != null && sectionDto.getShuffleQuestions())
                        .shuffleOptions(sectionDto.getShuffleOptions() != null && sectionDto.getShuffleOptions())
                        .autoNumbering(sectionDto.getAutoNumbering() != null ? sectionDto.getAutoNumbering() : true)
                        .lockNavigation(sectionDto.getLockNavigation() != null && sectionDto.getLockNavigation())
                        .questionRandomization(sectionDto.getQuestionRandomization() != null && sectionDto.getQuestionRandomization())
                        .icon(sectionDto.getIcon())
                        .colorTheme(sectionDto.getColorTheme())
                        .instructions(sectionDto.getInstructions())
                        .difficulty(sectionDto.getDifficulty())
                        .passingScore(sectionDto.getPassingScore())
                        .questions(new java.util.ArrayList<>())
                        .build();
                existingPassages.add(passage);
            }
            
            passage = passageRepository.save(passage);
            updateQuestions(sectionDto.getQuestions(), passage, exam);
        }
        
        for (int i = incomingSections.size(); i < existingPassages.size(); i++) {
            passagesToRemove.add(existingPassages.get(i));
        }
        
        existingPassages.removeAll(passagesToRemove);
    }

    private void updateQuestions(List<CreateExamRequest.QuestionDto> incomingQuestions, Passage passage, Exam exam) {
        List<Question> existingQuestions = passage.getQuestions();
        if (existingQuestions == null) {
            existingQuestions = new java.util.ArrayList<>();
            passage.setQuestions(existingQuestions);
        }
        
        if (incomingQuestions == null) {
            incomingQuestions = new java.util.ArrayList<>();
        }
        
        List<Question> questionsToRemove = new java.util.ArrayList<>();
        int qOrder = 1;
        
        for (int i = 0; i < incomingQuestions.size(); i++) {
            CreateExamRequest.QuestionDto qDto = incomingQuestions.get(i);
            if (qDto.getPrompt() == null || qDto.getPrompt().isBlank()) continue;
            
            Question q;
            if (i < existingQuestions.size()) {
                q = existingQuestions.get(i);
                boolean isChanged = !java.util.Objects.equals(q.getText(), qDto.getPrompt())
                        || !java.util.Objects.equals(q.getQuestionType(), qDto.getQtype())
                        || !java.util.Objects.equals(q.getPoints(), qDto.getPoints())
                        || !java.util.Objects.equals(q.getExplanation(), qDto.getExplanation());

                boolean isUsed = studentAnswerRepository.existsByQuestionId(q.getId());

                if (isChanged && isUsed) {
                    q = Question.builder()
                            .exam(exam)
                            .passage(passage)
                            .text(qDto.getPrompt())
                            .questionType(qDto.getQtype() != null ? qDto.getQtype() : "single_choice")
                            .points(qDto.getPoints() != null ? qDto.getPoints() : 1)
                            .negativeMarks(qDto.getNegativeMarks() != null ? qDto.getNegativeMarks() : 0.0)
                            .imageUrl(qDto.getImageUrl())
                            .imagePosition(qDto.getImagePosition() != null ? qDto.getImagePosition() : "top")
                            .audioUrl(qDto.getAudioUrl())
                            .videoUrl(qDto.getVideoUrl())
                            .formulaLatex(qDto.getFormulaLatex())
                            .matchingPairs(qDto.getMatchingPairs())
                            .fillTemplate(qDto.getFillTemplate())
                            .positionOrder(qOrder++)
                            .explanation(qDto.getExplanation())
                            .hint(qDto.getHint())
                            .topic(qDto.getTopic())
                            .subtopic(qDto.getSubtopic())
                            .tags(qDto.getTags())
                            .difficulty(qDto.getDifficulty() != null ? qDto.getDifficulty() : "medium")
                            .numericAnswer(qDto.getNumericAnswer())
                            .numericTolerance(qDto.getNumericTolerance())
                            .wordLimit(qDto.getWordLimit())
                            .status("published")
                            .version(q.getVersion() != null ? q.getVersion() + 1 : 2)
                            .parentId(q.getParentId() != null ? q.getParentId() : q.getId())
                            .options(new java.util.ArrayList<>())
                            .build();
                    existingQuestions.set(i, q);
                } else {
                    q.setText(qDto.getPrompt());
                    q.setQuestionType(qDto.getQtype() != null ? qDto.getQtype() : "single_choice");
                    q.setPoints(qDto.getPoints() != null ? qDto.getPoints() : 1);
                    q.setNegativeMarks(qDto.getNegativeMarks() != null ? qDto.getNegativeMarks() : 0.0);
                    q.setImageUrl(qDto.getImageUrl());
                    q.setImagePosition(qDto.getImagePosition() != null ? qDto.getImagePosition() : "top");
                    q.setAudioUrl(qDto.getAudioUrl());
                    q.setVideoUrl(qDto.getVideoUrl());
                    q.setFormulaLatex(qDto.getFormulaLatex());
                    q.setMatchingPairs(qDto.getMatchingPairs());
                    q.setFillTemplate(qDto.getFillTemplate());
                    q.setPositionOrder(qOrder++);
                    q.setExplanation(qDto.getExplanation());
                    q.setHint(qDto.getHint());
                    q.setTopic(qDto.getTopic());
                    q.setSubtopic(qDto.getSubtopic());
                    q.setTags(qDto.getTags());
                    q.setDifficulty(qDto.getDifficulty() != null ? qDto.getDifficulty() : "medium");
                    q.setNumericAnswer(qDto.getNumericAnswer());
                    q.setNumericTolerance(qDto.getNumericTolerance());
                    q.setWordLimit(qDto.getWordLimit());
                }
            } else {
                q = Question.builder()
                        .exam(exam)
                        .passage(passage)
                        .text(qDto.getPrompt())
                        .questionType(qDto.getQtype() != null ? qDto.getQtype() : "single_choice")
                        .points(qDto.getPoints() != null ? qDto.getPoints() : 1)
                        .negativeMarks(qDto.getNegativeMarks() != null ? qDto.getNegativeMarks() : 0.0)
                        .imageUrl(qDto.getImageUrl())
                        .imagePosition(qDto.getImagePosition() != null ? qDto.getImagePosition() : "top")
                        .audioUrl(qDto.getAudioUrl())
                        .videoUrl(qDto.getVideoUrl())
                        .formulaLatex(qDto.getFormulaLatex())
                        .matchingPairs(qDto.getMatchingPairs())
                        .fillTemplate(qDto.getFillTemplate())
                        .positionOrder(qOrder++)
                        .explanation(qDto.getExplanation())
                        .hint(qDto.getHint())
                        .topic(qDto.getTopic())
                        .subtopic(qDto.getSubtopic())
                        .tags(qDto.getTags())
                        .difficulty(qDto.getDifficulty() != null ? qDto.getDifficulty() : "medium")
                        .numericAnswer(qDto.getNumericAnswer())
                        .numericTolerance(qDto.getNumericTolerance())
                        .wordLimit(qDto.getWordLimit())
                        .status("draft")
                        .version(1)
                        .parentId(null)
                        .options(new java.util.ArrayList<>())
                        .build();
                existingQuestions.add(q);
            }

            q = questionRepository.save(q);
            updateOptions(qDto.getOptions(), q);
        }
        
        for (int i = incomingQuestions.size(); i < existingQuestions.size(); i++) {
            questionsToRemove.add(existingQuestions.get(i));
        }
        
        existingQuestions.removeAll(questionsToRemove);
    }

    private void updateOptions(List<CreateExamRequest.OptionDto> incomingOptions, Question q) {
        List<QuestionOption> existingOptions = q.getOptions();
        if (existingOptions == null) {
            existingOptions = new java.util.ArrayList<>();
            q.setOptions(existingOptions);
        }
        
        if (incomingOptions == null) {
            incomingOptions = new java.util.ArrayList<>();
        }
        
        List<QuestionOption> optionsToRemove = new java.util.ArrayList<>();
        int optOrder = 1;
        
        for (int i = 0; i < incomingOptions.size(); i++) {
            CreateExamRequest.OptionDto optDto = incomingOptions.get(i);
            
            QuestionOption opt;
            if (i < existingOptions.size()) {
                opt = existingOptions.get(i);
                opt.setText(optDto.getText() != null ? optDto.getText() : "");
                opt.setIsCorrect(optDto.getIsCorrect() != null && optDto.getIsCorrect());
                opt.setImageUrl(optDto.getImageUrl());
                opt.setImagePosition(optDto.getImagePosition() != null ? optDto.getImagePosition() : "left");
                opt.setPositionOrder(optOrder++);
            } else {
                opt = QuestionOption.builder()
                        .question(q)
                        .text(optDto.getText() != null ? optDto.getText() : "")
                        .isCorrect(optDto.getIsCorrect() != null && optDto.getIsCorrect())
                        .imageUrl(optDto.getImageUrl())
                        .imagePosition(optDto.getImagePosition() != null ? optDto.getImagePosition() : "left")
                        .positionOrder(optOrder++)
                        .build();
                existingOptions.add(opt);
            }
            
            optionRepository.save(opt);
        }
        
        for (int i = incomingOptions.size(); i < existingOptions.size(); i++) {
            optionsToRemove.add(existingOptions.get(i));
        }
        
        existingOptions.removeAll(optionsToRemove);
    }

    private void saveSections(CreateExamRequest request, Exam exam) {
        if (request.getSections() != null) {
            int passageOrder = 1;
            for (CreateExamRequest.SectionDto sectionDto : request.getSections()) {
                // Build passage with all new enterprise fields
                Passage.PassageBuilder pb = Passage.builder()
                        .exam(exam)
                        .title(sectionDto.getTitle() != null ? sectionDto.getTitle() : "Section " + passageOrder)
                        .content(sectionDto.getPassage() != null ? sectionDto.getPassage() : "")
                        .imageUrl(sectionDto.getImageUrl())
                        .positionOrder(passageOrder++)
                        .questions(new java.util.ArrayList<>());

                // New section-level enterprise fields (graceful: only set if field exists in entity)
                try { pb.audioUrl(sectionDto.getAudioUrl()); } catch (Exception ignored) {}

                Passage passage = pb.build();

                // Set extra fields via setters if they exist (forward-compatible)
                try { if (sectionDto.getTimeLimitSeconds() != null) passage.setTimeLimitSeconds(sectionDto.getTimeLimitSeconds()); } catch (Exception ignored) {}
                try { if (sectionDto.getShuffleQuestions() != null) passage.setShuffleQuestions(sectionDto.getShuffleQuestions()); } catch (Exception ignored) {}
                try { if (sectionDto.getShuffleOptions() != null) passage.setShuffleOptions(sectionDto.getShuffleOptions()); } catch (Exception ignored) {}
                try { if (sectionDto.getLockNavigation() != null) passage.setLockNavigation(sectionDto.getLockNavigation()); } catch (Exception ignored) {}
                try { if (sectionDto.getIcon() != null) passage.setIcon(sectionDto.getIcon()); } catch (Exception ignored) {}
                try { if (sectionDto.getColorTheme() != null) passage.setColorTheme(sectionDto.getColorTheme()); } catch (Exception ignored) {}
                try { if (sectionDto.getInstructions() != null) passage.setInstructions(sectionDto.getInstructions()); } catch (Exception ignored) {}
                try { if (sectionDto.getDifficulty() != null) passage.setDifficulty(sectionDto.getDifficulty()); } catch (Exception ignored) {}
                try { if (sectionDto.getPassingScore() != null) passage.setPassingScore(sectionDto.getPassingScore()); } catch (Exception ignored) {}

                if (exam.getPassages() != null) {
                    exam.getPassages().add(passage);
                }
                passage = passageRepository.save(passage);

                if (sectionDto.getQuestions() != null) {
                    int qOrder = 1;
                    for (CreateExamRequest.QuestionDto qDto : sectionDto.getQuestions()) {
                        // Skip empty questions
                        if (qDto.getPrompt() == null || qDto.getPrompt().isBlank()) continue;

                        Question q = Question.builder()
                                .exam(exam)
                                .passage(passage)
                                .text(qDto.getPrompt())
                                .questionType(qDto.getQtype() != null ? qDto.getQtype() : "single_choice")
                                .points(qDto.getPoints() != null ? qDto.getPoints() : 1)
                                .negativeMarks(qDto.getNegativeMarks() != null ? qDto.getNegativeMarks() : 0.0)
                                .imageUrl(qDto.getImageUrl())
                                .imagePosition(qDto.getImagePosition() != null ? qDto.getImagePosition() : "top")
                                .audioUrl(qDto.getAudioUrl())
                                .videoUrl(qDto.getVideoUrl())
                                .formulaLatex(qDto.getFormulaLatex())
                                .matchingPairs(qDto.getMatchingPairs())
                                .fillTemplate(qDto.getFillTemplate())
                                .positionOrder(qOrder++)
                                .explanation(qDto.getExplanation())
                                .hint(qDto.getHint())
                                .topic(qDto.getTopic())
                                .subtopic(qDto.getSubtopic())
                                .tags(qDto.getTags())
                                .difficulty(qDto.getDifficulty() != null ? qDto.getDifficulty() : "medium")
                                .numericAnswer(qDto.getNumericAnswer())
                                .numericTolerance(qDto.getNumericTolerance())
                                .wordLimit(qDto.getWordLimit())
                                .status("draft")
                                .options(new java.util.ArrayList<>())
                                .build();

                        passage.getQuestions().add(q);
                        q = questionRepository.save(q);

                        if (qDto.getOptions() != null && !qDto.getOptions().isEmpty()) {
                            int optOrder = 1;
                            for (CreateExamRequest.OptionDto optDto : qDto.getOptions()) {
                                QuestionOption opt = QuestionOption.builder()
                                        .question(q)
                                        .text(optDto.getText() != null ? optDto.getText() : "")
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

    private boolean tableExists(String tableName) {
        try {
            Number count = (Number) entityManager.createNativeQuery(
                            "SELECT COUNT(*) FROM information_schema.tables WHERE LOWER(table_name) = LOWER(:tableName)")
                    .setParameter("tableName", tableName)
                    .getSingleResult();
            return count != null && count.intValue() > 0;
        } catch (Exception e) {
            return false;
        }
    }

    @Transactional
    public void deleteExam(UUID id) {
        // 1. Delete student answers associated with attempts of this exam
        if (tableExists("student_answers") && tableExists("student_attempts")) {
            entityManager.createNativeQuery("DELETE FROM public.student_answers WHERE attempt_id IN (SELECT id FROM public.student_attempts WHERE exam_id = :examId)")
                    .setParameter("examId", id)
                    .executeUpdate();
        }

        // 2. Delete exam violations associated with attempts of this exam
        if (tableExists("exam_violations") && tableExists("student_attempts")) {
            entityManager.createNativeQuery("DELETE FROM public.exam_violations WHERE attempt_id IN (SELECT id FROM public.student_attempts WHERE exam_id = :examId)")
                    .setParameter("examId", id)
                    .executeUpdate();
        }

        // 3. Delete student attempts associated with this exam
        if (tableExists("student_attempts")) {
            entityManager.createNativeQuery("DELETE FROM public.student_attempts WHERE exam_id = :examId")
                    .setParameter("examId", id)
                    .executeUpdate();
        }

        // 4. Delete subscription pack associations
        if (tableExists("subscription_pack_exams")) {
            entityManager.createNativeQuery("DELETE FROM public.subscription_pack_exams WHERE exam_id = :examId")
                    .setParameter("examId", id)
                    .executeUpdate();
        }

        // 5. Delete question options associated with the questions of this exam
        if (tableExists("question_options") && tableExists("questions")) {
            entityManager.createNativeQuery("DELETE FROM public.question_options WHERE question_id IN (SELECT id FROM public.questions WHERE exam_id = :examId)")
                    .setParameter("examId", id)
                    .executeUpdate();
        }

        // 6. Delete questions associated with this exam
        if (tableExists("questions")) {
            entityManager.createNativeQuery("DELETE FROM public.questions WHERE exam_id = :examId")
                    .setParameter("examId", id)
                    .executeUpdate();
        }

        // 7. Delete passages associated with this exam
        if (tableExists("passages")) {
            entityManager.createNativeQuery("DELETE FROM public.passages WHERE exam_id = :examId")
                    .setParameter("examId", id)
                    .executeUpdate();
        }

        // 8. Delete the exam itself
        if (tableExists("exams")) {
            entityManager.createNativeQuery("DELETE FROM public.exams WHERE id = :examId")
                    .setParameter("examId", id)
                    .executeUpdate();
        }
    }

    @Transactional
    public ExamResultDto submitExam(ExamSubmitRequest request, User user) {
        if (request == null) {
            throw new IllegalArgumentException("Submit request cannot be null");
        }

        UUID targetExamId = request.getExamId();
        if (targetExamId == null) {
            throw new IllegalArgumentException("Exam ID is required for submission");
        }

        Exam exam = examRepository.findById(targetExamId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + targetExamId));

        // Resolve StudentAttempt first
        StudentAttempt attempt = null;
        if (user != null) {
            java.util.Optional<StudentAttempt> attemptOpt = studentAttemptRepository.findByExamIdAndStudentId(exam.getId(), user.getId());
            if (attemptOpt.isPresent()) {
                attempt = attemptOpt.get();
                studentAnswerRepository.deleteByAttemptId(attempt.getId());
            } else {
                attempt = new StudentAttempt();
                attempt.setExam(exam);
                attempt.setStudent(user);
                attempt.setAttemptSeed(java.util.UUID.randomUUID().toString());
                attempt.setStartedAt(java.time.LocalDateTime.now().minusMinutes(exam.getDurationMinutes() != null ? exam.getDurationMinutes() : 60));
                attempt = studentAttemptRepository.save(attempt);
            }
        }

        // Load attempt questions (from snapshot) if dynamic blueprint, otherwise static questions
        List<Question> questions = new ArrayList<>();
        if (attempt != null) {
            questions = questionRepository.findByStudentAttemptIdOrderByPositionOrderAsc(attempt.getId());
        }
        if (questions.isEmpty()) {
            questions = questionRepository.findByExamIdAndStudentAttemptIsNullOrderByPositionOrderAsc(exam.getId());
        }

        List<ExamResultDto.QuestionDetail> details = new ArrayList<>();
        int correctCount = 0;
        
        long totalTimeSpent = 0;
        Map<String, Long> timeSpentMap = request.getTimeSpentMap();
        if (timeSpentMap != null && !timeSpentMap.isEmpty()) {
            totalTimeSpent = timeSpentMap.values().stream().filter(java.util.Objects::nonNull).mapToLong(Long::longValue).sum();
        }

        Map<String, String> answersMap = request.getAnswers() != null ? request.getAnswers() : java.util.Collections.emptyMap();

        for (Question q : questions) {
            String qIdStr = q.getId().toString();
            String userAns = answersMap.get(qIdStr);
            Long timeSpent = timeSpentMap != null ? timeSpentMap.getOrDefault(qIdStr, 0L) : 0L;
            if (timeSpent == null) timeSpent = 0L;
            
            // Get correct answer from options
            List<QuestionOption> options = optionRepository.findByQuestionIdOrderByPositionOrderAsc(q.getId());
            String correctAns = options.stream()
                    .filter(QuestionOption::getIsCorrect)
                    .map(QuestionOption::getText)
                    .findFirst()
                    .orElse("");

            // Core Strategy Verification Engine Call
            com.lmscrm.backend.service.exam.scoring.ValidationResult verifyResult = null;
            try {
                verifyResult = answerVerificationEngine.verifyAnswer(q, userAns);
            } catch (Exception e) {
                log.warn("Answer verification failed for question {}: {}", q.getId(), e.getMessage());
            }

            boolean isCorrect = verifyResult != null && verifyResult.isCorrect();
            int points = q.getPoints() != null ? q.getPoints() : 1;
            if (isCorrect) {
                correctCount += points;
            }

            details.add(ExamResultDto.QuestionDetail.builder()
                    .questionId(qIdStr)
                    .userAns(userAns != null ? userAns : "")
                    .correctAns(correctAns)
                    .ok(isCorrect)
                    .timeSpentSeconds(timeSpent.intValue())
                    .build());
        }

        String kind = exam.getType().name().toLowerCase();
        double band = IeltsGradingUtils.rawToBand(kind, correctCount, questions.size());
        
        String examDataJson = "";
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
            
            examDataJson = objectMapper.writeValueAsString(examDataMap);
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(ExamService.class).error("Failed to build exam JSON: ", e);
        }

        if (user != null && attempt != null) {
            attempt.setFinishedAt(java.time.LocalDateTime.now());
            attempt.setTotalScore(correctCount);
            attempt.setMaxScore(questions.size());
            attempt.setIsPassed(correctCount >= exam.getPassingScore());
            attempt.setOverallBand(band);
            attempt.setTimeUsedSeconds((int) totalTimeSpent);
            attempt.setAiCoachFeedback(null);
            attempt.setPredictedScore(null);
            attempt.setAutoSubmitted(request.getAuto_submitted() != null ? request.getAuto_submitted() : false);
            attempt = studentAttemptRepository.save(attempt);

            // Calculate and save practice session minutes based on exam attempt time
            int secondsUsed = attempt.getTimeUsedSeconds() != null ? attempt.getTimeUsedSeconds() : 0;
            if (secondsUsed == 0 && attempt.getStartedAt() != null) {
                secondsUsed = (int) java.time.Duration.between(attempt.getStartedAt(), attempt.getFinishedAt()).toSeconds();
                attempt.setTimeUsedSeconds(secondsUsed);
            }
            double minutesUsed = secondsUsed / 60.0;
            if (minutesUsed > 0.0) {
                PracticeSession session = PracticeSession.builder()
                        .user(user)
                        .minutes(Math.round(minutesUsed * 10.0) / 10.0)
                        .createdAt(attempt.getFinishedAt())
                        .build();
                practiceSessionRepository.save(session);
            }

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
                
                QuestionOption selectedOption = null;
                if (userAns != null && !userAns.trim().isEmpty()) {
                    selectedOption = options.stream()
                            .filter(o -> o.getText().equalsIgnoreCase(userAns.trim()))
                            .findFirst()
                            .orElse(null);
                }

                com.lmscrm.backend.service.exam.scoring.ValidationResult verifyResult = 
                        answerVerificationEngine.verifyAnswer(q, userAns);

                StudentAnswer answer = StudentAnswer.builder()
                        .attempt(attempt)
                        .question(q)
                        .selectedOption(selectedOption)
                        .userAnswerText(userAns)
                        .isCorrect(verifyResult.isCorrect())
                        .pointsEarned((int) verifyResult.getPointsEarned())
                        .timeSpentSeconds(timeSpent.intValue())
                        .aiExplanation(null)
                        .build();
                studentAnswerRepository.save(answer);
            }

            // Publish submission event for async listeners (rewards, notifications, leaderboards)
            eventPublisher.publishEvent(new com.lmscrm.backend.event.ExamSubmittedEvent(
                    this, attempt, user, attempt.getIsPassed(), correctCount, questions.size()));

            if (!examDataJson.isEmpty()) {
                final UUID finalAttemptId = attempt.getId();
                final String finalExamDataJson = examDataJson;
                java.util.concurrent.CompletableFuture.runAsync(() -> {
                    updateAttemptWithAiFeedback(finalAttemptId, finalExamDataJson);
                });
            }
        }

        return ExamResultDto.builder()
                .attemptId(attempt != null ? attempt.getId() : null)
                .attemptSeed(attempt != null ? attempt.getAttemptSeed() : null)
                .kind(kind)
                .correct(correctCount)
                .total(questions.size())
                .bandScore(band)
                .detail(details)
                .timeUsedSeconds((int)totalTimeSpent)
                .aiCoachFeedback(null)
                .predictedScore(null)
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
                .attemptId(attempt.getId())
                .attemptSeed(attempt.getAttemptSeed())
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

    @Transactional(readOnly = true)
    public ExamResultDto getExamResultByAttemptId(UUID attemptId, User student) {
        StudentAttempt attempt = studentAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("No attempt found with id: " + attemptId));

        if (!attempt.getStudent().getId().equals(student.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("You do not have permission to view this attempt result");
        }

        List<Question> questions = questionRepository.findByExamIdOrderByPositionOrderAsc(attempt.getExam().getId());
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
                .attemptId(attempt.getId())
                .attemptSeed(attempt.getAttemptSeed())
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

    public void updateAttemptWithAiFeedback(UUID attemptId, String examDataJson) {
        try {
            String reviewResult = geminiService.generateExamReview(examDataJson);
            if (reviewResult != null) {
                StudentAttempt attempt = studentAttemptRepository.findById(attemptId).orElse(null);
                if (attempt == null) return;

                JsonNode root = objectMapper.readTree(reviewResult);
                String aiCoachFeedback = null;
                String predictedScore = null;
                if (root.has("coachFeedback")) {
                    aiCoachFeedback = objectMapper.writeValueAsString(root.get("coachFeedback"));
                }
                if (root.has("predictedScore")) {
                    predictedScore = root.get("predictedScore").asText();
                }
                attempt.setAiCoachFeedback(aiCoachFeedback);
                attempt.setPredictedScore(predictedScore);
                studentAttemptRepository.save(attempt);

                if (root.has("explanations")) {
                    JsonNode explanationsNode = root.get("explanations");
                    List<StudentAnswer> answers = studentAnswerRepository.findByAttemptId(attemptId);
                    for (StudentAnswer answer : answers) {
                        String qId = answer.getQuestion().getId().toString();
                        if (explanationsNode.has(qId)) {
                            answer.setAiExplanation(explanationsNode.get(qId).asText());
                            studentAnswerRepository.save(answer);
                        }
                    }
                }
            }
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(ExamService.class).error("Failed to generate and save AI review asynchronously: ", e);
        }
    }

    @Transactional
    public ExamDto duplicateExam(UUID examId, User user) {
        Exam original = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + examId));

        String finalTitle = "Copy of " + original.getTitle();
        while (examRepository.existsByTitle(finalTitle)) {
            finalTitle = "Copy of " + original.getTitle() + " (" + new java.util.Random().nextInt(1000) + ")";
        }

        Exam duplicate = Exam.builder()
                .title(finalTitle)
                .description(original.getDescription())
                .difficulty(original.getDifficulty())
                .audioUrl(original.getAudioUrl())
                .pdfUrl(original.getPdfUrl())
                .type(original.getType())
                .durationMinutes(original.getDurationMinutes())
                .passingScore(original.getPassingScore())
                .requiredPack(original.getRequiredPack())
                .organization(original.getOrganization())
                .createdBy(user)
                .isActive(true)
                .status("DRAFT")
                .subType(original.getSubType())
                .isAiImported(false)
                .passages(new ArrayList<>())
                .build();

        duplicate = examRepository.save(duplicate);

        List<Passage> passages = passageRepository.findByExamIdOrderByPositionOrderAsc(original.getId());
        for (Passage p : passages) {
            Passage newP = Passage.builder()
                    .exam(duplicate)
                    .title(p.getTitle())
                    .content(p.getContent())
                    .positionOrder(p.getPositionOrder())
                    .imageUrl(p.getImageUrl())
                    .audioUrl(p.getAudioUrl())
                    .pdfAttachment(p.getPdfAttachment())
                    .timeLimitSeconds(p.getTimeLimitSeconds())
                    .shuffleQuestions(p.getShuffleQuestions())
                    .shuffleOptions(p.getShuffleOptions())
                    .autoNumbering(p.getAutoNumbering())
                    .lockNavigation(p.getLockNavigation())
                    .questionRandomization(p.getQuestionRandomization())
                    .icon(p.getIcon())
                    .colorTheme(p.getColorTheme())
                    .instructions(p.getInstructions())
                    .difficulty(p.getDifficulty())
                    .passingScore(p.getPassingScore())
                    .questions(new ArrayList<>())
                    .build();

            newP = passageRepository.save(newP);
            duplicate.getPassages().add(newP);

            List<Question> questions = questionRepository.findByPassageIdOrderByPositionOrderAsc(p.getId());
            for (Question q : questions) {
                Question newQ = Question.builder()
                        .exam(duplicate)
                        .passage(newP)
                        .questionType(q.getQuestionType())
                        .text(q.getText())
                        .points(q.getPoints())
                        .negativeMarks(q.getNegativeMarks())
                        .positionOrder(q.getPositionOrder())
                        .imageUrl(q.getImageUrl())
                        .imagePosition(q.getImagePosition())
                        .audioUrl(q.getAudioUrl())
                        .videoUrl(q.getVideoUrl())
                        .formulaLatex(q.getFormulaLatex())
                        .matchingPairs(q.getMatchingPairs())
                        .fillTemplate(q.getFillTemplate())
                        .explanation(q.getExplanation())
                        .hint(q.getHint())
                        .topic(q.getTopic())
                        .subtopic(q.getSubtopic())
                        .tags(q.getTags())
                        .difficulty(q.getDifficulty())
                        .status("draft")
                        .timeLimitSeconds(q.getTimeLimitSeconds())
                        .numericAnswer(q.getNumericAnswer())
                        .numericTolerance(q.getNumericTolerance())
                        .wordLimit(q.getWordLimit())
                        .options(new ArrayList<>())
                        .build();

                newQ = questionRepository.save(newQ);
                newP.getQuestions().add(newQ);

                List<QuestionOption> options = optionRepository.findByQuestionIdOrderByPositionOrderAsc(q.getId());
                for (QuestionOption o : options) {
                    QuestionOption newO = QuestionOption.builder()
                            .question(newQ)
                            .text(o.getText())
                            .isCorrect(o.getIsCorrect())
                            .positionOrder(o.getPositionOrder())
                            .imageUrl(o.getImageUrl())
                            .imagePosition(o.getImagePosition())
                            .build();

                    optionRepository.save(newO);
                    newQ.getOptions().add(newO);
                }
            }
        }

        return getExamDetails(duplicate.getId());
    }

    @Transactional
    public void bulkPublish(List<UUID> ids, User author) {
        if (!author.getRole().name().equals("SUPER_ADMIN")) {
            throw new com.lmscrm.backend.exception.BusinessException("Faqat Super Admin nashr eta oladi!");
        }
        for (UUID id : ids) {
            examRepository.findById(id).ifPresent(exam -> {
                exam.setStatus("PUBLISHED");
                exam.setPublishedAt(java.time.LocalDateTime.now());
                examRepository.save(exam);
            });
        }
    }

    @Transactional
    public void bulkArchive(List<UUID> ids) {
        for (UUID id : ids) {
            examRepository.findById(id).ifPresent(exam -> {
                exam.setStatus("ARCHIVED");
                examRepository.save(exam);
            });
        }
    }

    @Transactional
    public void bulkDelete(List<UUID> ids) {
        for (UUID id : ids) {
            deleteExam(id);
        }
    }

    @Transactional
    public List<ExamDto> bulkDuplicate(List<UUID> ids, User user) {
        List<ExamDto> duplicates = new ArrayList<>();
        for (UUID id : ids) {
            duplicates.add(duplicateExam(id, user));
        }
        return duplicates;
    }

    @Transactional(readOnly = true)
    public byte[] bulkExport(List<UUID> ids) throws Exception {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (java.util.zip.ZipOutputStream zos = new java.util.zip.ZipOutputStream(bos)) {
            for (UUID id : ids) {
                Exam exam = examRepository.findById(id).orElse(null);
                if (exam != null) {
                    ExamDto dto = getExamDetails(id);
                    byte[] jsonBytes = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(dto);
                    java.util.zip.ZipEntry entry = new java.util.zip.ZipEntry(exam.getTitle().replaceAll("[^a-zA-Z0-9.-]", "_") + "_" + exam.getId() + ".json");
                    zos.putNextEntry(entry);
                    zos.write(jsonBytes);
                    zos.closeEntry();
                }
            }
        }
        return bos.toByteArray();
    }

    @Transactional
    public ExamDto importExamZip(org.springframework.web.multipart.MultipartFile file, User author) throws Exception {
        Map<String, byte[]> zipContents = new java.util.HashMap<>();
        try (java.util.zip.ZipInputStream zis = new java.util.zip.ZipInputStream(file.getInputStream())) {
            java.util.zip.ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (!entry.isDirectory()) {
                    ByteArrayOutputStream bos = new ByteArrayOutputStream();
                    byte[] buffer = new byte[1024];
                    int len;
                    while ((len = zis.read(buffer)) > 0) {
                        bos.write(buffer, 0, len);
                    }
                    zipContents.put(entry.getName(), bos.toByteArray());
                }
                zis.closeEntry();
            }
        }

        String jsonKey = zipContents.keySet().stream()
                .filter(k -> k.endsWith("exam.json"))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("exam.json topilmadi"));

        byte[] jsonBytes = zipContents.get(jsonKey);
        CreateExamRequest request = objectMapper.readValue(jsonBytes, CreateExamRequest.class);

        String zipFolderPrefix = "";
        if (jsonKey.contains("/")) {
            zipFolderPrefix = jsonKey.substring(0, jsonKey.lastIndexOf('/') + 1);
        }

        Map<String, String> assetUrls = new java.util.HashMap<>();
        for (String key : zipContents.keySet()) {
            if (key.endsWith("exam.json") || key.endsWith("/")) continue;

            byte[] data = zipContents.get(key);
            String relativePath = key;
            if (!zipFolderPrefix.isEmpty() && key.startsWith(zipFolderPrefix)) {
                relativePath = key.substring(zipFolderPrefix.length());
            }

            String originalName = relativePath.contains("/") ? relativePath.substring(relativePath.lastIndexOf('/') + 1) : relativePath;
            String cleanedName = UUID.randomUUID().toString() + "-" + originalName.replaceAll("[^a-zA-Z0-9.-]", "_");
            String contentType = getMimeTypeFallback(cleanedName);

            String subFolder = null;
            if (relativePath.contains("/")) {
                subFolder = relativePath.substring(0, relativePath.indexOf('/'));
            }

            String webUrl = storeBytesHybrid(data, cleanedName, contentType, subFolder);
            assetUrls.put(relativePath, webUrl);
            assetUrls.put(key, webUrl);
        }

        if (request.getAudioUrl() != null && assetUrls.containsKey(request.getAudioUrl())) {
            request.setAudioUrl(assetUrls.get(request.getAudioUrl()));
        }
        if (request.getPdfUrl() != null && assetUrls.containsKey(request.getPdfUrl())) {
            request.setPdfUrl(assetUrls.get(request.getPdfUrl()));
        }

        if (request.getSections() != null) {
            for (CreateExamRequest.SectionDto s : request.getSections()) {
                if (s.getImageUrl() != null && assetUrls.containsKey(s.getImageUrl())) {
                    s.setImageUrl(assetUrls.get(s.getImageUrl()));
                }
                if (s.getAudioUrl() != null && assetUrls.containsKey(s.getAudioUrl())) {
                    s.setAudioUrl(assetUrls.get(s.getAudioUrl()));
                }
                if (s.getPdfAttachment() != null && assetUrls.containsKey(s.getPdfAttachment())) {
                    s.setPdfAttachment(assetUrls.get(s.getPdfAttachment()));
                }

                if (s.getQuestions() != null) {
                    for (CreateExamRequest.QuestionDto q : s.getQuestions()) {
                        if (q.getImageUrl() != null && assetUrls.containsKey(q.getImageUrl())) {
                            q.setImageUrl(assetUrls.get(q.getImageUrl()));
                        }
                        if (q.getAudioUrl() != null && assetUrls.containsKey(q.getAudioUrl())) {
                            q.setAudioUrl(assetUrls.get(q.getAudioUrl()));
                        }
                        if (q.getVideoUrl() != null && assetUrls.containsKey(q.getVideoUrl())) {
                            q.setVideoUrl(assetUrls.get(q.getVideoUrl()));
                        }

                        if (q.getOptions() != null) {
                            for (CreateExamRequest.OptionDto o : q.getOptions()) {
                                if (o.getImageUrl() != null && assetUrls.containsKey(o.getImageUrl())) {
                                    o.setImageUrl(assetUrls.get(o.getImageUrl()));
                                }
                            }
                        }
                    }
                }
            }
        }

        request.setStatus("UNDER_REVIEW");
        request.setIsAiImported(true);

        return createMockExam(request, author);
    }

    public String extractMockFromUrl(String urlString) {
        try {
            java.net.URL url = new java.net.URL(urlString);
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(15000);

            int status = conn.getResponseCode();
            if (status != 200) {
                throw new RuntimeException("Web sahifani yuklab bo'lmadi, HTTP kod: " + status);
            }

            BufferedReader in = new BufferedReader(new java.io.InputStreamReader(conn.getInputStream(), java.nio.charset.StandardCharsets.UTF_8));
            String inputLine;
            StringBuilder content = new StringBuilder();
            while ((inputLine = in.readLine()) != null) {
                content.append(inputLine).append("\n");
            }
            in.close();
            conn.disconnect();

            String html = content.toString();
            String cleanText = html.replaceAll("<script[^>]*>[\\s\\S]*?</script>", "")
                                   .replaceAll("<style[^>]*>[\\s\\S]*?</style>", "")
                                   .replaceAll("<[^>]*>", " ")
                                   .replaceAll("\\s+", " ")
                                   .trim();
            if (cleanText.length() > 50000) {
                cleanText = cleanText.substring(0, 50000);
            }

            return geminiService.analyzeIeltsMockWithImages(cleanText, new ArrayList<>());
        } catch (Exception e) {
            throw new RuntimeException("URL orqali tahlil qilishda xatolik: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMockAnalytics() {
        Map<String, Object> stats = new java.util.HashMap<>();

        try {
            Number total = (Number) entityManager.createNativeQuery("SELECT COUNT(*) FROM public.exams").getSingleResult();
            Number published = (Number) entityManager.createNativeQuery("SELECT COUNT(*) FROM public.exams WHERE status = 'PUBLISHED'").getSingleResult();
            Number draft = (Number) entityManager.createNativeQuery("SELECT COUNT(*) FROM public.exams WHERE status = 'DRAFT'").getSingleResult();
            Number review = (Number) entityManager.createNativeQuery("SELECT COUNT(*) FROM public.exams WHERE status = 'UNDER_REVIEW'").getSingleResult();
            Number archived = (Number) entityManager.createNativeQuery("SELECT COUNT(*) FROM public.exams WHERE status = 'ARCHIVED'").getSingleResult();

            stats.put("totalMocks", total.longValue());
            stats.put("publishedMocks", published.longValue());
            stats.put("draftMocks", draft.longValue());
            stats.put("underReviewMocks", review.longValue());
            stats.put("archivedMocks", archived.longValue());

            Number totalAttempts = (Number) entityManager.createNativeQuery("SELECT COUNT(*) FROM public.student_attempts").getSingleResult();
            Number finishedAttempts = (Number) entityManager.createNativeQuery("SELECT COUNT(*) FROM public.student_attempts WHERE finished_at IS NOT NULL").getSingleResult();

            double completionRate = 0.0;
            if (totalAttempts.longValue() > 0) {
                completionRate = (finishedAttempts.doubleValue() / totalAttempts.doubleValue()) * 100.0;
            }
            stats.put("totalAttempts", totalAttempts.longValue());
            stats.put("completionRate", Math.round(completionRate * 10.0) / 10.0);

            Double avgScore = null;
            try {
                avgScore = (Double) entityManager.createNativeQuery("SELECT AVG(CASE WHEN max_score > 0 THEN (total_score * 100.0 / max_score) ELSE 0.0 END) FROM public.student_attempts WHERE finished_at IS NOT NULL").getSingleResult();
            } catch (Exception ignored) {}
            stats.put("avgScore", avgScore != null ? Math.round(avgScore * 10.0) / 10.0 : 0.0);

            String mostSolvedExam = "—";
            try {
                List<?> row = entityManager.createNativeQuery("SELECT e.title, COUNT(sa.id) as cnt FROM public.student_attempts sa JOIN public.exams e ON sa.exam_id = e.id GROUP BY e.title ORDER BY cnt DESC LIMIT 1").getResultList();
                if (!row.isEmpty()) {
                    Object[] arr = (Object[]) row.get(0);
                    mostSolvedExam = (String) arr[0];
                }
            } catch (Exception ignored) {}
            stats.put("mostSolvedExam", mostSolvedExam);

            String mostDifficultType = "—";
            try {
                List<?> row = entityManager.createNativeQuery("SELECT q.question_type, SUM(CASE WHEN sa.is_correct = true THEN 1 ELSE 0 END) * 1.0 / COUNT(sa.id) as ratio FROM public.student_answers sa JOIN public.questions q ON sa.question_id = q.id GROUP BY q.question_type ORDER BY ratio ASC LIMIT 1").getResultList();
                if (!row.isEmpty()) {
                    Object[] arr = (Object[]) row.get(0);
                    mostDifficultType = (String) arr[0];
                }
            } catch (Exception ignored) {}
            stats.put("mostDifficultQuestionType", mostDifficultType);

        } catch (Exception e) {
            log.error("Failed to generate mock analytics: ", e);
        }

        return stats;
    }

    private String storeBytesHybrid(byte[] data, String filename, String contentType, String subFolder) throws IOException {
        long size = data.length;
        String dbKey = (subFolder != null && !subFolder.isEmpty()) ? subFolder + "/" + filename : filename;

        if (size < 2 * 1024 * 1024) {
            DbStoredFile storedFile = DbStoredFile.builder()
                    .filename(dbKey)
                    .contentType(contentType)
                    .fileSize(size)
                    .storageType("DB")
                    .data(data)
                    .build();
            dbStoredFileRepository.save(storedFile);
        } else {
            java.nio.file.Path targetDir = java.nio.file.Paths.get(uploadDir);
            if (subFolder != null && !subFolder.isEmpty()) {
                targetDir = targetDir.resolve(subFolder);
            }
            if (!java.nio.file.Files.exists(targetDir)) {
                java.nio.file.Files.createDirectories(targetDir);
            }
            java.nio.file.Path targetPath = targetDir.resolve(filename);
            java.nio.file.Files.write(targetPath, data);

            DbStoredFile storedFile = DbStoredFile.builder()
                    .filename(dbKey)
                    .contentType(contentType)
                    .fileSize(size)
                    .storageType("LOCAL")
                    .path(targetPath.toString())
                    .build();
            dbStoredFileRepository.save(storedFile);
        }

        if (subFolder != null && !subFolder.isEmpty()) {
            return "/api/v1/files/view/" + subFolder + "/" + filename;
        } else {
            return "/api/v1/files/view/" + filename;
        }
    }

    private String getMimeTypeFallback(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        if (lower.endsWith(".wav")) return "audio/wav";
        if (lower.endsWith(".m4a")) return "audio/mp4";
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }
}

