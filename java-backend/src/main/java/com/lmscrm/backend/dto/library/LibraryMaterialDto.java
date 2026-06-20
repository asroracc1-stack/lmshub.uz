package com.lmscrm.backend.dto.library;

import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class LibraryMaterialDto {
    private UUID id;
    private UUID categoryId;
    private String categoryName;
    private String categoryCode;
    private String title;
    private String author;
    private String description;
    private String subject;
    private String grade;
    private String topic;
    private String coverImageUrl;
    private String pdfUrl;
    private String accessType;
    private String status;
    private Integer viewsCount;
    private Integer downloadsCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isFavorite;
    private Integer lastReadPage;
}
