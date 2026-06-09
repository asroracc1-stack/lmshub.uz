package com.lmscrm.backend.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Address {


    private String region;


    private String district;


    @Column(name = "street_address")
    private String streetAddress;

    public String getFullAddress() {
        if (region == null && district == null && streetAddress == null) return null;
        String full = String.format("%s, %s, %s", 
            region != null ? region : "", 
            district != null ? district : "", 
            streetAddress != null ? streetAddress : "").replaceAll("^, |, $", "").trim();
        return full.replaceAll(" ,", ",").replaceAll(",{2,}", ",");
    }
}
