package com.lmscrm.backend.service.admin;

import com.lmscrm.backend.domain.entity.Organization;
import com.lmscrm.backend.dto.admin.OrganizationDto;
import com.lmscrm.backend.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import com.lmscrm.backend.domain.entity.Address;
import com.lmscrm.backend.dto.admin.AddressDto;

@Service
@RequiredArgsConstructor
public class OrganizationService {

    private final OrganizationRepository organizationRepository;

    public Page<OrganizationDto> getOrganizations(String query, Pageable pageable) {
        Page<Organization> orgs;
        if (query != null && !query.isEmpty()) {
            orgs = organizationRepository.searchOrganizations(query, pageable);
        } else {
            orgs = organizationRepository.findAll(pageable);
        }
        return orgs.map(this::toDto);
    }

    public OrganizationDto getOrganizationById(UUID id) {
        return organizationRepository.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new RuntimeException("Organization not found"));
    }

    public List<OrganizationDto> getAllOrganizations() {
        return organizationRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public OrganizationDto createOrganization(OrganizationDto dto) {
        Organization org = Organization.builder()
                .name(dto.getName())
                .slug(dto.getSlug())
                .description(dto.getDescription())
                .logoUrl(dto.getLogoUrl())
                .subscriptionPackage(dto.getPlanId() != null ? com.lmscrm.backend.domain.entity.SubscriptionPackage.builder().id(dto.getPlanId()).build() : null)
                .address(dto.getAddress() != null ? Address.builder()
                        .region(dto.getAddress().getRegion())
                        .district(dto.getAddress().getDistrict())
                        .streetAddress(dto.getAddress().getStreetAddress())
                        .build() : null)
                .phone(dto.getPhone())
                .email(dto.getEmail())
                .isActive(dto.getIsActive())
                .build();
        return toDto(organizationRepository.save(org));
    }

    public OrganizationDto updateOrganization(UUID id, OrganizationDto dto) {
        Organization org = organizationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Organization not found"));
        org.setName(dto.getName());
        if (dto.getSlug() != null && !dto.getSlug().isEmpty()) {
            org.setSlug(dto.getSlug());
        }
        org.setDescription(dto.getDescription());
        org.setLogoUrl(dto.getLogoUrl());
        if (dto.getPlanId() != null) {
            org.setSubscriptionPackage(com.lmscrm.backend.domain.entity.SubscriptionPackage.builder().id(dto.getPlanId()).build());
        }
        if (dto.getAddress() != null) {
            org.setAddress(Address.builder()
                    .region(dto.getAddress().getRegion())
                    .district(dto.getAddress().getDistrict())
                    .streetAddress(dto.getAddress().getStreetAddress())
                    .build());
        } else {
            org.setAddress(null);
        }
        org.setPhone(dto.getPhone());
        org.setEmail(dto.getEmail());
        if (dto.getIsActive() != null) {
            org.setIsActive(dto.getIsActive());
        }
        return toDto(organizationRepository.save(org));
    }

    public void deleteOrganization(UUID id) {
        organizationRepository.deleteById(id);
    }

    private OrganizationDto toDto(Organization org) {
        return OrganizationDto.builder()
                .id(org.getId())
                .name(org.getName())
                .slug(org.getSlug())
                .description(org.getDescription())
                .logoUrl(org.getLogoUrl())
                .planId(org.getSubscriptionPackage() != null ? org.getSubscriptionPackage().getId() : null)
                .address(org.getAddress() != null ? AddressDto.builder()
                        .region(org.getAddress().getRegion())
                        .district(org.getAddress().getDistrict())
                        .streetAddress(org.getAddress().getStreetAddress())
                        .fullAddress(org.getAddress().getFullAddress())
                        .build() : null)
                .phone(org.getPhone())
                .email(org.getEmail())
                .isActive(org.getIsActive())
                .createdAt(org.getCreatedAt())
                .build();
    }
}
