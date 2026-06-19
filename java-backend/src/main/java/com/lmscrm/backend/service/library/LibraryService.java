package com.lmscrm.backend.service.library;

import com.lmscrm.backend.domain.entity.*;
import com.lmscrm.backend.dto.library.LibraryMaterialDto;
import com.lmscrm.backend.dto.library.LibraryMaterialRequest;
import com.lmscrm.backend.dto.library.LibraryStatsDto;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LibraryService {

    private final LibraryCategoryRepository categoryRepository;
    private final LibraryMaterialRepository materialRepository;
    private final LibraryViewRepository viewRepository;
    private final LibraryProgressRepository progressRepository;
    private final LibraryFavoriteRepository favoriteRepository;
    private final LibraryDownloadRepository downloadRepository;
    private final LibraryStatisticRepository statisticRepository;

    @PersistenceContext
    private EntityManager entityManager;

    // ─── USER SUBSCRIPTION CHECK ────────────────────────────────────────────────
    public String getUserSubscriptionType(UUID userId) {
        try {
            List<?> subRows = entityManager.createNativeQuery(
                "SELECT sp.type FROM public.user_subscriptions us " +
                "JOIN public.subscription_packs sp ON sp.id = us.pack_id " +
                "WHERE us.user_id = :userId AND us.is_active = true " +
                "AND (us.expires_at IS NULL OR us.expires_at > NOW()) " +
                "ORDER BY CASE sp.type WHEN 'ELITE' THEN 1 WHEN 'PRO' THEN 2 ELSE 3 END LIMIT 1"
            ).setParameter("userId", userId).getResultList();

            if (!subRows.isEmpty()) {
                return subRows.get(0).toString(); // "ELITE", "PRO" or "FREE"
            }
        } catch (Exception e) {
            log.error("Error checking subscription for user {}: {}", userId, e.getMessage());
        }
        return "FREE";
    }

    public boolean hasAccess(LibraryMaterial material, User user) {
        if (user == null) return false;

        // Elevated roles bypass subscription checks
        String role = user.getRole().name();
        if (role.equals("SUPER_ADMIN") || role.equals("ADMIN") || role.equals("ADMINISTRATOR") || role.equals("TEACHER")) {
            return true;
        }

        if ("FREE".equalsIgnoreCase(material.getAccessType())) {
            return true;
        }

        String userTier = getUserSubscriptionType(user.getId());

        if ("PRO".equalsIgnoreCase(material.getAccessType())) {
            return "PRO".equalsIgnoreCase(userTier) || "ELITE".equalsIgnoreCase(userTier);
        }

        if ("ELITE".equalsIgnoreCase(material.getAccessType())) {
            return "ELITE".equalsIgnoreCase(userTier);
        }

        return false;
    }

    // ─── CATEGORY METHODS ───────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<LibraryCategory> getCategories() {
        return categoryRepository.findAll();
    }

    @Transactional(readOnly = true)
    public LibraryCategory getCategoryByCode(String code) {
        return categoryRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Kategoriya topilmadi: " + code));
    }

    // ─── MATERIAL CRUD METHODS ──────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public Page<LibraryMaterialDto> getMaterials(
            UUID categoryId,
            String subject,
            String grade,
            String accessType,
            String status,
            String search,
            int page,
            int size,
            User currentUser
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        // If user is a Student or Regular User, they can ONLY view ACTIVE status
        String role = currentUser.getRole().name();
        String queryStatus = status;
        if (role.equals("STUDENT") || role.equals("USER") || role.equals("PARENT")) {
            queryStatus = "ACTIVE";
        }

        Page<LibraryMaterial> materials = materialRepository.findFiltered(
                categoryId,
                blankToNull(subject),
                blankToNull(grade),
                blankToNull(accessType),
                blankToNull(queryStatus),
                blankToNull(search),
                pageable
        );

        return materials.map(m -> toDto(m, currentUser));
    }

    @Transactional
    public LibraryMaterialDto getMaterialById(UUID materialId, User currentUser) {
        LibraryMaterial material = materialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material topilmadi: " + materialId));

        // Increment view count
        material.setViewsCount(material.getViewsCount() + 1);
        materialRepository.save(material);

        // Record View history
        LibraryView view = LibraryView.builder()
                .material(material)
                .user(currentUser)
                .build();
        viewRepository.save(view);

        return toDto(material, currentUser);
    }

    @Transactional
    public LibraryMaterialDto createMaterial(LibraryMaterialRequest request, User creator) {
        LibraryCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Kategoriya topilmadi: " + request.getCategoryId()));

        LibraryMaterial material = LibraryMaterial.builder()
                .category(category)
                .title(request.getTitle())
                .author(request.getAuthor())
                .description(request.getDescription())
                .subject(request.getSubject())
                .grade(request.getGrade())
                .topic(request.getTopic())
                .coverImageUrl(request.getCoverImageUrl())
                .pdfUrl(request.getPdfUrl())
                .accessType(request.getAccessType() != null ? request.getAccessType() : "FREE")
                .status(request.getStatus() != null ? request.getStatus() : "ACTIVE")
                .createdBy(creator)
                .build();

        LibraryMaterial saved = materialRepository.save(material);
        updateCachedStatistics();
        return toDto(saved, creator);
    }

    @Transactional
    public LibraryMaterialDto updateMaterial(UUID materialId, LibraryMaterialRequest request) {
        LibraryMaterial material = materialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material topilmadi: " + materialId));

        LibraryCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Kategoriya topilmadi: " + request.getCategoryId()));

        material.setCategory(category);
        material.setTitle(request.getTitle());
        material.setAuthor(request.getAuthor());
        material.setDescription(request.getDescription());
        material.setSubject(request.getSubject());
        material.setGrade(request.getGrade());
        material.setTopic(request.getTopic());
        if (request.getCoverImageUrl() != null) material.setCoverImageUrl(request.getCoverImageUrl());
        if (request.getPdfUrl() != null) material.setPdfUrl(request.getPdfUrl());
        if (request.getAccessType() != null) material.setAccessType(request.getAccessType());
        if (request.getStatus() != null) material.setStatus(request.getStatus());

        LibraryMaterial saved = materialRepository.save(material);
        updateCachedStatistics();
        return toDto(saved, null);
    }

    @Transactional
    public void deleteMaterial(UUID materialId) {
        LibraryMaterial material = materialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material topilmadi: " + materialId));
        materialRepository.delete(material);
        updateCachedStatistics();
    }

    // ─── USER PROGRESS & INTERACTIONS ───────────────────────────────────────────
    @Transactional
    public boolean toggleFavorite(UUID materialId, User currentUser) {
        LibraryMaterial material = materialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material topilmadi: " + materialId));

        Optional<LibraryFavorite> existing = favoriteRepository.findByUserIdAndMaterialId(currentUser.getId(), materialId);
        if (existing.isPresent()) {
            favoriteRepository.delete(existing.get());
            return false;
        } else {
            LibraryFavorite favorite = LibraryFavorite.builder()
                    .material(material)
                    .user(currentUser)
                    .build();
            favoriteRepository.save(favorite);
            return true;
        }
    }

    @Transactional(readOnly = true)
    public List<LibraryMaterialDto> getFavorites(User currentUser) {
        List<LibraryFavorite> favorites = favoriteRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());
        return favorites.stream()
                .map(f -> toDto(f.getMaterial(), currentUser))
                .collect(Collectors.toList());
    }

    @Transactional
    public void saveProgress(UUID materialId, int lastPage, User currentUser) {
        LibraryMaterial material = materialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material topilmadi: " + materialId));

        if (!hasAccess(material, currentUser)) {
            throw new AccessDeniedException("Ushbu material obuna uchun mavjud");
        }

        LibraryProgress progress = progressRepository.findByUserIdAndMaterialId(currentUser.getId(), materialId)
                .orElse(LibraryProgress.builder()
                        .material(material)
                        .user(currentUser)
                        .build());

        progress.setLastPage(lastPage);
        progressRepository.save(progress);
    }

    @Transactional(readOnly = true)
    public int getProgress(UUID materialId, User currentUser) {
        return progressRepository.findByUserIdAndMaterialId(currentUser.getId(), materialId)
                .map(LibraryProgress::getLastPage)
                .orElse(1);
    }

    @Transactional
    public void recordDownload(UUID materialId, User currentUser) {
        LibraryMaterial material = materialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material topilmadi: " + materialId));

        if (!hasAccess(material, currentUser)) {
            throw new AccessDeniedException("Yuklab olish uchun ruxsat yo'q");
        }

        material.setDownloadsCount(material.getDownloadsCount() + 1);
        materialRepository.save(material);

        LibraryDownload download = LibraryDownload.builder()
                .material(material)
                .user(currentUser)
                .build();
        downloadRepository.save(download);
    }

    // ─── STATISTICS ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public LibraryStatsDto getStatistics() {
        // Return dynamic real-time stats
        long totalMaterials = materialRepository.count();
        long totalPdfs = materialRepository.countPdfMaterials("ACTIVE") + materialRepository.countPdfMaterials("DRAFT") + materialRepository.countPdfMaterials("HIDDEN");
        
        // Sum views_count across all materials
        Long totalViews = materialRepository.findAll().stream()
                .mapToLong(LibraryMaterial::getViewsCount)
                .sum();

        // Popular kitob
        List<LibraryMaterial> popularBooks = materialRepository.findPopularMaterialsByCategory("adabiy_kitoblar", PageRequest.of(0, 1));
        String popularBook = popularBooks.isEmpty() ? "Yo'q" : popularBooks.get(0).getTitle();

        // Popular darslik
        List<LibraryMaterial> popularTextbooks = materialRepository.findPopularMaterialsByCategory("maktab_darsliklari", PageRequest.of(0, 1));
        String popularTextbook = popularTextbooks.isEmpty() ? "Yo'q" : popularTextbooks.get(0).getTitle();

        // Popular o'quv qo'llanma
        List<LibraryMaterial> popularGuides = materialRepository.findPopularMaterialsByCategory("oquv_qollanmalar", PageRequest.of(0, 1));
        String popularGuide = popularGuides.isEmpty() ? "Yo'q" : popularGuides.get(0).getTitle();

        long freeCount = materialRepository.countByAccessTypeAndStatus("FREE", "ACTIVE");
        long proCount = materialRepository.countByAccessTypeAndStatus("PRO", "ACTIVE");
        long eliteCount = materialRepository.countByAccessTypeAndStatus("ELITE", "ACTIVE");

        return LibraryStatsDto.builder()
                .totalMaterials(totalMaterials)
                .totalPdfs(totalPdfs)
                .totalViews(totalViews)
                .popularBook(popularBook)
                .popularTextbook(popularTextbook)
                .popularGuide(popularGuide)
                .freeCount(freeCount)
                .proCount(proCount)
                .eliteCount(eliteCount)
                .build();
    }

    @Transactional
    public void updateCachedStatistics() {
        try {
            LibraryStatsDto stats = getStatistics();
            saveOrUpdateStat("total_materials", String.valueOf(stats.getTotalMaterials()));
            saveOrUpdateStat("total_pdfs", String.valueOf(stats.getTotalPdfs()));
            saveOrUpdateStat("total_views", String.valueOf(stats.getTotalViews()));
            saveOrUpdateStat("popular_book", stats.getPopularBook());
            saveOrUpdateStat("popular_textbook", stats.getPopularTextbook());
            saveOrUpdateStat("popular_guide", stats.getPopularGuide());
            saveOrUpdateStat("free_count", String.valueOf(stats.getFreeCount()));
            saveOrUpdateStat("pro_count", String.valueOf(stats.getProCount()));
            saveOrUpdateStat("elite_count", String.valueOf(stats.getEliteCount()));
        } catch (Exception e) {
            log.error("Failed to update cached statistics: {}", e.getMessage());
        }
    }

    private void saveOrUpdateStat(String key, String value) {
        LibraryStatistic stat = statisticRepository.findByMetricName(key)
                .orElse(LibraryStatistic.builder().metricName(key).build());
        stat.setMetricValue(value);
        stat.setUpdatedAt(LocalDateTime.now());
        statisticRepository.save(stat);
    }

    // ─── FILTERS LIST ───────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<String> getSubjects() {
        return materialRepository.findAllSubjects();
    }

    @Transactional(readOnly = true)
    public List<String> getGrades() {
        return materialRepository.findAllGrades();
    }

    // ─── MAPPING HELPER ─────────────────────────────────────────────────────────
    public LibraryMaterialDto toDto(LibraryMaterial material, User user) {
        LibraryMaterialDto dto = new LibraryMaterialDto();
        dto.setId(material.getId());
        dto.setCategoryId(material.getCategory().getId());
        dto.setCategoryName(material.getCategory().getName());
        dto.setCategoryCode(material.getCategory().getCode());
        dto.setTitle(material.getTitle());
        dto.setAuthor(material.getAuthor());
        dto.setDescription(material.getDescription());
        dto.setSubject(material.getSubject());
        dto.setGrade(material.getGrade());
        dto.setTopic(material.getTopic());
        dto.setCoverImageUrl(material.getCoverImageUrl());
        dto.setPdfUrl(material.getPdfUrl());
        dto.setAccessType(material.getAccessType());
        dto.setStatus(material.getStatus());
        dto.setViewsCount(material.getViewsCount());
        dto.setDownloadsCount(material.getDownloadsCount());
        dto.setCreatedAt(material.getCreatedAt());
        dto.setUpdatedAt(material.getUpdatedAt());

        if (user != null) {
            dto.setIsFavorite(favoriteRepository.existsByUserIdAndMaterialId(user.getId(), material.getId()));
            progressRepository.findByUserIdAndMaterialId(user.getId(), material.getId())
                    .ifPresent(p -> dto.setLastReadPage(p.getLastPage()));
        } else {
            dto.setIsFavorite(false);
            dto.setLastReadPage(null);
        }
        return dto;
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
