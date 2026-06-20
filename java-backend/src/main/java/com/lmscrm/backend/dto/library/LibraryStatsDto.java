package com.lmscrm.backend.dto.library;

import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
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
