package com.lmscrm.backend.service.exam;

import com.lmscrm.backend.domain.entity.QuestionBankItem;
import com.lmscrm.backend.domain.entity.QuestionBankOption;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.exam.QuestionBankDto;
import com.lmscrm.backend.dto.exam.QuestionBankRequest;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.repository.QuestionBankOptionRepository;
import com.lmscrm.backend.repository.QuestionBankRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuestionBankService {

    private final QuestionBankRepository questionBankRepository;
    private final QuestionBankOptionRepository optionRepository;

    // ─── Barcha savollar (filter bilan) ─────────────────────────────────────────
    @Transactional(readOnly = true)
    public Page<QuestionBankDto> getQuestions(
            String subject,
            String topic,
            String examCategory,
            String questionType,
            String difficulty,
            String search,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<QuestionBankItem> items = questionBankRepository.findFiltered(
                blankToNull(subject),
                blankToNull(topic),
                blankToNull(examCategory),
                blankToNull(questionType),
                blankToNull(difficulty),
                blankToNull(search),
                pageable
        );

        return items.map(this::toDto);
    }

    // ─── Bitta savol ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public QuestionBankDto getById(UUID id) {
        QuestionBankItem item = findOrThrow(id);
        return toDto(item);
    }

    // ─── Yaratish ────────────────────────────────────────────────────────────────
    @Transactional
    public QuestionBankDto create(QuestionBankRequest request, User createdBy) {
        QuestionBankItem item = QuestionBankItem.builder()
                .subject(request.getSubject())
                .topic(request.getTopic())
                .examCategory(request.getExamCategory())
                .questionType(request.getQuestionType())
                .difficulty(request.getDifficulty())
                .text(request.getText())
                .richContent(request.getRichContent())
                .passageText(request.getPassageText())
                .audioUrl(request.getAudioUrl())
                .imageUrl(request.getImageUrl())
                .imagePosition(request.getImagePosition())
                .correctAnswer(request.getCorrectAnswer())
                .explanation(request.getExplanation())
                .points(request.getPoints() != null ? request.getPoints() : 1)
                .matchingPairs(request.getMatchingPairs())
                .tags(request.getTags())
                .isActive(true)
                .usageCount(0)
                .createdBy(createdBy)
                .build();

        QuestionBankItem saved = questionBankRepository.save(item);

        // Options ni saqlash
        if (request.getOptions() != null && !request.getOptions().isEmpty()) {
            saveOptions(saved, request.getOptions());
            saved = questionBankRepository.findById(saved.getId()).orElse(saved);
        }

        return toDto(saved);
    }

    // ─── Yangilash ───────────────────────────────────────────────────────────────
    @Transactional
    public QuestionBankDto update(UUID id, QuestionBankRequest request) {
        QuestionBankItem item = findOrThrow(id);

        if (request.getSubject() != null) item.setSubject(request.getSubject());
        if (request.getTopic() != null) item.setTopic(request.getTopic());
        if (request.getExamCategory() != null) item.setExamCategory(request.getExamCategory());
        if (request.getQuestionType() != null) item.setQuestionType(request.getQuestionType());
        if (request.getDifficulty() != null) item.setDifficulty(request.getDifficulty());
        if (request.getText() != null) item.setText(request.getText());
        if (request.getRichContent() != null) item.setRichContent(request.getRichContent());
        if (request.getPassageText() != null) item.setPassageText(request.getPassageText());
        if (request.getAudioUrl() != null) item.setAudioUrl(request.getAudioUrl());
        if (request.getImageUrl() != null) item.setImageUrl(request.getImageUrl());
        if (request.getImagePosition() != null) item.setImagePosition(request.getImagePosition());
        if (request.getCorrectAnswer() != null) item.setCorrectAnswer(request.getCorrectAnswer());
        if (request.getExplanation() != null) item.setExplanation(request.getExplanation());
        if (request.getPoints() != null) item.setPoints(request.getPoints());
        if (request.getMatchingPairs() != null) item.setMatchingPairs(request.getMatchingPairs());
        if (request.getTags() != null) item.setTags(request.getTags());

        // Options ni yangilash: eski optionslarni o'chirib yangilarini yozamiz
        if (request.getOptions() != null) {
            optionRepository.deleteByQuestionBankItemId(id);
            optionRepository.flush();
            if (!request.getOptions().isEmpty()) {
                saveOptions(item, request.getOptions());
            }
        }

        QuestionBankItem saved = questionBankRepository.save(item);
        return toDto(saved);
    }

    // ─── O'chirish (soft delete) ─────────────────────────────────────────────────
    @Transactional
    public void delete(UUID id) {
        QuestionBankItem item = findOrThrow(id);
        item.setIsActive(false);
        questionBankRepository.save(item);
    }

    // ─── Butunlay o'chirish ───────────────────────────────────────────────────────
    @Transactional
    public void hardDelete(UUID id) {
        QuestionBankItem item = findOrThrow(id);
        optionRepository.deleteByQuestionBankItemId(id);
        questionBankRepository.delete(item);
    }

    // ─── Statistika ──────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("total", questionBankRepository.countByIsActiveTrue());
        stats.put("byDifficulty", Map.of(
                "easy", questionBankRepository.countByDifficultyAndIsActiveTrue("easy"),
                "medium", questionBankRepository.countByDifficultyAndIsActiveTrue("medium"),
                "hard", questionBankRepository.countByDifficultyAndIsActiveTrue("hard")
        ));
        // Exam category bo'yicha
        Map<String, Long> byCategory = new HashMap<>();
        for (String cat : List.of("SAT", "IELTS", "MILLIY_SERTIFIKAT", "GENERAL")) {
            byCategory.put(cat, questionBankRepository.countByExamCategoryAndIsActiveTrue(cat));
        }
        stats.put("byCategory", byCategory);
        stats.put("subjects", questionBankRepository.findAllSubjects());
        return stats;
    }

    // ─── Subjects list ────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<String> getSubjects() {
        return questionBankRepository.findAllSubjects();
    }

    // ─── Topics by subject ────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<String> getTopics(String subject) {
        return questionBankRepository.findTopicsBySubject(subject);
    }

    // ─── Helper methods ──────────────────────────────────────────────────────────

    private void saveOptions(QuestionBankItem item, List<QuestionBankRequest.OptionRequest> optionRequests) {
        List<QuestionBankOption> options = new ArrayList<>();
        for (int i = 0; i < optionRequests.size(); i++) {
            QuestionBankRequest.OptionRequest req = optionRequests.get(i);
            QuestionBankOption opt = QuestionBankOption.builder()
                    .questionBankItem(item)
                    .text(req.getText())
                    .isCorrect(req.getIsCorrect() != null && req.getIsCorrect())
                    .positionOrder(req.getPositionOrder() != null ? req.getPositionOrder() : i)
                    .imageUrl(req.getImageUrl())
                    .imagePosition(req.getImagePosition())
                    .build();
            options.add(opt);
        }
        optionRepository.saveAll(options);
    }

    private QuestionBankDto toDto(QuestionBankItem item) {
        QuestionBankDto dto = new QuestionBankDto();
        dto.setId(item.getId());
        dto.setSubject(item.getSubject());
        dto.setTopic(item.getTopic());
        dto.setExamCategory(item.getExamCategory());
        dto.setQuestionType(item.getQuestionType());
        dto.setDifficulty(item.getDifficulty());
        dto.setText(item.getText());
        dto.setRichContent(item.getRichContent());
        dto.setPassageText(item.getPassageText());
        dto.setAudioUrl(item.getAudioUrl());
        dto.setImageUrl(item.getImageUrl());
        dto.setImagePosition(item.getImagePosition());
        dto.setCorrectAnswer(item.getCorrectAnswer());
        dto.setExplanation(item.getExplanation());
        dto.setPoints(item.getPoints());
        dto.setMatchingPairs(item.getMatchingPairs());
        dto.setTags(item.getTags());
        dto.setUsageCount(item.getUsageCount());
        dto.setIsActive(item.getIsActive());
        dto.setCreatedAt(item.getCreatedAt());
        dto.setUpdatedAt(item.getUpdatedAt());

        if (item.getCreatedBy() != null) {
            String name = item.getCreatedBy().getFirstName() != null
                    ? item.getCreatedBy().getFirstName() + " " + (item.getCreatedBy().getLastName() != null ? item.getCreatedBy().getLastName() : "")
                    : item.getCreatedBy().getUsername();
            dto.setCreatedByName(name.trim());
        }

        // Options
        List<QuestionBankOption> opts = optionRepository.findByQuestionBankItemIdOrderByPositionOrderAsc(item.getId());
        if (opts != null && !opts.isEmpty()) {
            dto.setOptions(opts.stream().map(o -> {
                QuestionBankDto.QuestionBankOptionDto oDto = new QuestionBankDto.QuestionBankOptionDto();
                oDto.setId(o.getId());
                oDto.setText(o.getText());
                oDto.setIsCorrect(o.getIsCorrect());
                oDto.setPositionOrder(o.getPositionOrder());
                oDto.setImageUrl(o.getImageUrl());
                oDto.setImagePosition(o.getImagePosition());
                return oDto;
            }).collect(Collectors.toList()));
        } else {
            dto.setOptions(List.of());
        }

        return dto;
    }

    private QuestionBankItem findOrThrow(UUID id) {
        return questionBankRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question bank item not found: " + id));
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
