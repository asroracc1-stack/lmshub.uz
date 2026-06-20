package com.lmscrm.backend.dto.library;

import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class LibraryProgressRequest {
    @NotNull(message = "Sahifa raqami bo'sh bo'lishi mumkin emas")
    @Min(value = 1, message = "Sahifa raqami kamida 1 bo'lishi kerak")
    private Integer lastPage;
}
