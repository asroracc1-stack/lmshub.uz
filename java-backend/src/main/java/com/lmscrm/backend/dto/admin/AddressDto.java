package com.lmscrm.backend.dto.admin;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddressDto {
    @NotBlank(message = "Viloyat kiritilishi shart")
    private String region;

    @NotBlank(message = "Tuman/Shahar kiritilishi shart")
    private String district;

    @NotBlank(message = "Manzil kiritilishi shart")
    private String streetAddress;
    
    private String fullAddress; // for frontend display purposes
}
