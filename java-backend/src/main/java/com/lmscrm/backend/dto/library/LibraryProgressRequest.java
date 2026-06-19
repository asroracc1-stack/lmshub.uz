package com.lmscrm.backend.dto.library;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class LibraryProgressRequest {
    @NotNull(message = "Sahifa raqami bo'sh bo'lishi mumkin emas")
    @Min(value = 1, message = "Sahifa raqami kamida 1 bo'lishi kerak")
    private Integer lastPage;
}
