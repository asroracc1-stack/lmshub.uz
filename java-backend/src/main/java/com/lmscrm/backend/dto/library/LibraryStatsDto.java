package com.lmscrm.backend.dto.library;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LibraryStatsDto {
    private Long totalMaterials;
    private Long totalPdfs;
    private Long totalViews;
    private String popularBook;
    private String popularTextbook;
    private String popularGuide;
    private Long freeCount;
    private Long proCount;
    private Long eliteCount;
}
