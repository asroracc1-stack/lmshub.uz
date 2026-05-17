package com.lmscrm.backend.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionPackageDto {
    private UUID id;

    @NotBlank(message = "Tarif nomi kiritilishi shart")
    private String name;

    private String description;

    @NotNull(message = "Narx kiritilishi shart")
    private BigDecimal price;

    private Integer maxOrganizations;
    private Integer maxStudents;
    private Integer maxTeachers;
}
