package com.lmscrm.backend.service;

import com.lmscrm.backend.domain.entity.SubscriptionPack;
import com.lmscrm.backend.domain.entity.Exam;
import com.lmscrm.backend.domain.entity.LibraryMaterial;
import com.lmscrm.backend.dto.admin.SubscriptionPackDto;
import com.lmscrm.backend.repository.SubscriptionPackRepository;
import com.lmscrm.backend.repository.ExamRepository;
import com.lmscrm.backend.repository.LibraryMaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubscriptionPackService {

    private final SubscriptionPackRepository repository;
    private final ExamRepository examRepository;
    private final LibraryMaterialRepository libraryMaterialRepository;
    private final TelegramBotService telegramBotService;

    @Transactional(readOnly = true)
    public List<SubscriptionPack> getAllPacks() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public List<SubscriptionPackDto> getAllPacksDto() {
        return repository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public SubscriptionPack createPack(SubscriptionPack pack) {
        if (Boolean.TRUE.equals(pack.getIsPopular())) {
            repository.findAll().forEach(p -> {
                if (Boolean.TRUE.equals(p.getIsPopular())) {
                    p.setIsPopular(false);
                    repository.save(p);
                }
            });
        }
        return repository.save(pack);
    }

    @Transactional
    public SubscriptionPackDto createPackDto(SubscriptionPackDto dto) {
        if (Boolean.TRUE.equals(dto.getIsPopular())) {
            repository.findAll().forEach(p -> {
                if (Boolean.TRUE.equals(p.getIsPopular())) {
                    p.setIsPopular(false);
                    repository.save(p);
                }
            });
        }

        List<Exam> exams = java.util.Collections.emptyList();
        if (dto.getExamIds() != null && !dto.getExamIds().isEmpty()) {
            exams = examRepository.findAllById(dto.getExamIds());
        }

        List<LibraryMaterial> allowedBooks = java.util.Collections.emptyList();
        if (dto.getAllowedBookIds() != null && !dto.getAllowedBookIds().isEmpty()) {
            allowedBooks = libraryMaterialRepository.findAllById(dto.getAllowedBookIds());
        }

        SubscriptionPack pack = SubscriptionPack.builder()
                .code(dto.getCode())
                .name(dto.getName())
                .price(dto.getPrice())
                .oldPrice(dto.getOldPrice())
                .discountPercent(dto.getDiscountPercent())
                .duration(dto.getDuration() != null ? dto.getDuration() : 1)
                .durationDays(dto.getDurationDays() != null ? dto.getDurationDays() : 30)
                .colorAndDesign(dto.getColorAndDesign())
                .icon(dto.getIcon())
                .accessAllMocks(dto.getAccessAllMocks() != null ? dto.getAccessAllMocks() : false)
                .accessSatMocks(dto.getAccessSatMocks() != null ? dto.getAccessSatMocks() : false)
                .accessNatMocks(dto.getAccessNatMocks() != null ? dto.getAccessNatMocks() : false)
                .accessIeltsMocks(dto.getAccessIeltsMocks() != null ? dto.getAccessIeltsMocks() : false)
                .accessCustomMocks(dto.getAccessCustomMocks() != null ? dto.getAccessCustomMocks() : false)
                .accessAllBooks(dto.getAccessAllBooks() != null ? dto.getAccessAllBooks() : false)
                .features(dto.getFeatures())
                .exams(exams)
                .allowedBooks(allowedBooks)
                .isPopular(dto.getIsPopular() != null ? dto.getIsPopular() : false)
                .type(SubscriptionPack.PackType.valueOf(dto.getType() != null ? dto.getType() : "PRO"))
                .status(dto.getStatus() != null ? dto.getStatus() : "ACTIVE")
                .totalPurchases(dto.getTotalPurchases() != null ? dto.getTotalPurchases() : 0)
                .build();

        return toDto(repository.save(pack));
    }

    @Transactional
    public SubscriptionPack updatePack(UUID id, SubscriptionPack details) {
        SubscriptionPack pack = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pack not found"));
        
        if (Boolean.TRUE.equals(details.getIsPopular())) {
            repository.findAll().forEach(p -> {
                if (Boolean.TRUE.equals(p.getIsPopular()) && !p.getId().equals(id)) {
                    p.setIsPopular(false);
                    repository.save(p);
                }
            });
        }

        pack.setCode(details.getCode());
        pack.setName(details.getName());
        pack.setPrice(details.getPrice());
        pack.setDuration(details.getDuration());
        pack.setFeatures(details.getFeatures());
        pack.setIsPopular(details.getIsPopular());
        pack.setStatus(details.getStatus());
        pack.setType(details.getType());
        if (details.getTotalPurchases() != null) {
            pack.setTotalPurchases(details.getTotalPurchases());
        }
        
        SubscriptionPack updated = repository.save(pack);

        // Notify via Telegram
        String message = String.format(
            "✏️ <b>Paket Tahrirlandi!</b>\n\n" +
            "📦 <b>Paket:</b> %s (%s)\n" +
            "💰 <b>Yangi Narx:</b> %s UZS\n" +
            "🕒 <b>Vaqt:</b> %s\n\n" +
            "✅ Ma'lumotlar muvaffaqiyatli yangilandi!",
            updated.getName(),
            updated.getType(),
            updated.getPrice(),
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        );
        telegramBotService.sendMessage(message);

        return updated;
    }

    @Transactional
    public SubscriptionPackDto updatePackDto(UUID id, SubscriptionPackDto dto) {
        SubscriptionPack pack = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pack not found"));

        if (Boolean.TRUE.equals(dto.getIsPopular())) {
            repository.findAll().forEach(p -> {
                if (Boolean.TRUE.equals(p.getIsPopular()) && !p.getId().equals(id)) {
                    p.setIsPopular(false);
                    repository.save(p);
                }
            });
        }

        List<Exam> exams = java.util.Collections.emptyList();
        if (dto.getExamIds() != null && !dto.getExamIds().isEmpty()) {
            exams = examRepository.findAllById(dto.getExamIds());
        }

        List<LibraryMaterial> allowedBooks = java.util.Collections.emptyList();
        if (dto.getAllowedBookIds() != null && !dto.getAllowedBookIds().isEmpty()) {
            allowedBooks = libraryMaterialRepository.findAllById(dto.getAllowedBookIds());
        }

        pack.setCode(dto.getCode());
        pack.setName(dto.getName());
        pack.setPrice(dto.getPrice());
        pack.setOldPrice(dto.getOldPrice());
        pack.setDiscountPercent(dto.getDiscountPercent());
        pack.setDuration(dto.getDuration() != null ? dto.getDuration() : 1);
        pack.setDurationDays(dto.getDurationDays() != null ? dto.getDurationDays() : 30);
        pack.setColorAndDesign(dto.getColorAndDesign());
        pack.setIcon(dto.getIcon());
        pack.setAccessAllMocks(dto.getAccessAllMocks() != null ? dto.getAccessAllMocks() : false);
        pack.setAccessSatMocks(dto.getAccessSatMocks() != null ? dto.getAccessSatMocks() : false);
        pack.setAccessNatMocks(dto.getAccessNatMocks() != null ? dto.getAccessNatMocks() : false);
        pack.setAccessIeltsMocks(dto.getAccessIeltsMocks() != null ? dto.getAccessIeltsMocks() : false);
        pack.setAccessCustomMocks(dto.getAccessCustomMocks() != null ? dto.getAccessCustomMocks() : false);
        pack.setAccessAllBooks(dto.getAccessAllBooks() != null ? dto.getAccessAllBooks() : false);
        pack.setFeatures(dto.getFeatures());
        pack.setExams(exams);
        pack.setAllowedBooks(allowedBooks);
        pack.setIsPopular(dto.getIsPopular() != null ? dto.getIsPopular() : false);
        pack.setStatus(dto.getStatus() != null ? dto.getStatus() : "ACTIVE");
        pack.setType(SubscriptionPack.PackType.valueOf(dto.getType() != null ? dto.getType() : "PRO"));
        if (dto.getTotalPurchases() != null) {
            pack.setTotalPurchases(dto.getTotalPurchases());
        }

        SubscriptionPack updated = repository.save(pack);

        // Notify via Telegram
        String message = String.format(
            "✏️ <b>Paket Tahrirlandi!</b>\n\n" +
            "📦 <b>Paket:</b> %s (%s)\n" +
            "💰 <b>Yangi Narx:</b> %s UZS\n" +
            "🕒 <b>Vaqt:</b> %s\n\n" +
            "✅ Ma'lumotlar muvaffaqiyatli yangilandi!",
            updated.getName(),
            updated.getType(),
            updated.getPrice(),
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
        );
        telegramBotService.sendMessage(message);

        return toDto(updated);
    }

    @Transactional
    public void deletePack(UUID id) {
        repository.deleteById(id);
    }

    public SubscriptionPackDto toDto(SubscriptionPack sp) {
        List<UUID> examIds = java.util.Collections.emptyList();
        if (sp.getExams() != null) {
            examIds = sp.getExams().stream().map(Exam::getId).collect(Collectors.toList());
        }
        List<UUID> allowedBookIds = java.util.Collections.emptyList();
        if (sp.getAllowedBooks() != null) {
            allowedBookIds = sp.getAllowedBooks().stream().map(LibraryMaterial::getId).collect(Collectors.toList());
        }
        return SubscriptionPackDto.builder()
                .id(sp.getId())
                .code(sp.getCode())
                .name(sp.getName())
                .price(sp.getPrice())
                .oldPrice(sp.getOldPrice())
                .discountPercent(sp.getDiscountPercent())
                .duration(sp.getDuration())
                .durationDays(sp.getDurationDays())
                .colorAndDesign(sp.getColorAndDesign())
                .icon(sp.getIcon())
                .accessAllMocks(sp.getAccessAllMocks())
                .accessSatMocks(sp.getAccessSatMocks())
                .accessNatMocks(sp.getAccessNatMocks())
                .accessIeltsMocks(sp.getAccessIeltsMocks())
                .accessCustomMocks(sp.getAccessCustomMocks())
                .accessAllBooks(sp.getAccessAllBooks())
                .features(sp.getFeatures())
                .isPopular(sp.getIsPopular())
                .type(sp.getType().name())
                .status(sp.getStatus())
                .totalPurchases(sp.getTotalPurchases())
                .examIds(examIds)
                .allowedBookIds(allowedBookIds)
                .build();
    }
}
