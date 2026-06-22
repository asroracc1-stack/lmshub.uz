package com.lmscrm.backend.service.library;

import com.lmscrm.backend.domain.entity.LibraryMaterial;
import com.lmscrm.backend.domain.entity.LibraryStatistic;
import com.lmscrm.backend.dto.library.LibraryStatsDto;
import com.lmscrm.backend.repository.LibraryMaterialRepository;
import com.lmscrm.backend.repository.LibraryStatisticRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LibraryStatsService {

    private final LibraryMaterialRepository materialRepository;
    private final LibraryStatisticRepository statisticRepository;

    @Transactional(readOnly = true)
    public LibraryStatsDto getStatistics() {
        long totalMaterials = materialRepository.count();
        long totalPdfs = materialRepository.countPdfMaterials("ACTIVE") + materialRepository.countPdfMaterials("DRAFT") + materialRepository.countPdfMaterials("HIDDEN");
        long totalViews = materialRepository.sumViewsCount();

        List<LibraryMaterial> popularBooks = materialRepository.findPopularMaterialsByCategory("adabiy_kitoblar", PageRequest.of(0, 1));
        String popularBook = popularBooks.isEmpty() ? "Yo'q" : popularBooks.get(0).getTitle();

        List<LibraryMaterial> popularTextbooks = materialRepository.findPopularMaterialsByCategory("maktab_darsliklari", PageRequest.of(0, 1));
        String popularTextbook = popularTextbooks.isEmpty() ? "Yo'q" : popularTextbooks.get(0).getTitle();

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

    @Async("taskExecutor")
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
            log.info("📊 Library statistics updated asynchronously successfully.");
        } catch (Exception e) {
            log.error("Failed to update cached statistics: {}", e.getMessage(), e);
        }
    }

    private void saveOrUpdateStat(String key, String value) {
        LibraryStatistic stat = statisticRepository.findByMetricName(key)
                .orElse(LibraryStatistic.builder().metricName(key).build());
        stat.setMetricValue(value);
        stat.setUpdatedAt(LocalDateTime.now());
        statisticRepository.save(stat);
    }
}
