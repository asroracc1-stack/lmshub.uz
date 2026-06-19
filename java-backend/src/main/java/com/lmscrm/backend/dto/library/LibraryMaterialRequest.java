package com.lmscrm.backend.dto.library;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class LibraryMaterialRequest {

    @NotNull(message = "Kategoriya kiritilishi shart")
    private UUID categoryId;

    @NotBlank(message = "Nomi kiritilishi shart")
    private String title;

    private String author;

    private String description;

    private String subject; // Fan

    private String grade; // Sinf

    private String topic; // Mavzu

    private String coverImageUrl;

    private String pdfUrl;

    private String accessType; // FREE, PRO, ELITE

    private String status; // ACTIVE, DRAFT, HIDDEN
}
