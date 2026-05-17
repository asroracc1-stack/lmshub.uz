package com.lmscrm.backend.service.admin;

import com.lmscrm.backend.domain.entity.PaymentReceiver;
import com.lmscrm.backend.repository.PaymentReceiverRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import com.lmscrm.backend.dto.admin.PaymentReceiverDto;
import com.lmscrm.backend.dto.admin.OrganizationDto;
import com.lmscrm.backend.dto.admin.AddressDto;

@Service
@RequiredArgsConstructor
public class PaymentReceiverService {

    private final PaymentReceiverRepository repository;

    public List<PaymentReceiverDto> getAllReceivers(String query) {
        List<PaymentReceiver> receivers;
        if (query != null && !query.isEmpty()) {
            receivers = repository.searchAll(query);
        } else {
            receivers = repository.findAll();
        }
        return receivers.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional
    public PaymentReceiverDto createReceiver(PaymentReceiver receiver) {
        if (Boolean.TRUE.equals(receiver.getIsDefault())) {
            resetDefaults(receiver.getOrganization() != null ? receiver.getOrganization().getId() : null);
        }
        return mapToDto(repository.save(receiver));
    }

    @Transactional
    public PaymentReceiverDto updateReceiver(UUID id, PaymentReceiver details) {
        PaymentReceiver receiver = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        if (Boolean.TRUE.equals(details.getIsDefault()) && !Boolean.TRUE.equals(receiver.getIsDefault())) {
            resetDefaults(details.getOrganization() != null ? details.getOrganization().getId() : null);
        }

        receiver.setFullName(details.getFullName());
        receiver.setCardNumber(details.getCardNumber());
        receiver.setCardHolder(details.getCardHolder());
        receiver.setTelegramUsername(details.getTelegramUsername());
        receiver.setTelegramChatId(details.getTelegramChatId());
        receiver.setPaymentPurpose(details.getPaymentPurpose());
        receiver.setIsActive(details.getIsActive() != null ? details.getIsActive() : true);
        receiver.setIsDefault(details.getIsDefault() != null ? details.getIsDefault() : false);
        receiver.setOrganization(details.getOrganization());

        return mapToDto(repository.save(receiver));
    }

    public void deleteReceiver(UUID id) {
        repository.deleteById(id);
    }

    private void resetDefaults(UUID orgId) {
        List<PaymentReceiver> defaults;
        if (orgId != null) {
            defaults = repository.findByIsDefaultTrueAndOrganizationId(orgId);
        } else {
            defaults = repository.findByIsDefaultTrueAndOrganizationIsNull();
        }
        
        for (PaymentReceiver pr : defaults) {
            pr.setIsDefault(false);
            repository.save(pr);
        }
    }

    private PaymentReceiverDto mapToDto(PaymentReceiver pr) {
        OrganizationDto orgDto = null;
        if (pr.getOrganization() != null) {
            orgDto = OrganizationDto.builder()
                    .id(pr.getOrganization().getId())
                    .name(pr.getOrganization().getName())
                    .slug(pr.getOrganization().getSlug())
                    .description(pr.getOrganization().getDescription())
                    .logoUrl(pr.getOrganization().getLogoUrl())
                    .planId(pr.getOrganization().getSubscriptionPackage() != null ? pr.getOrganization().getSubscriptionPackage().getId() : null)
                    .address(pr.getOrganization().getAddress() != null ? AddressDto.builder()
                            .region(pr.getOrganization().getAddress().getRegion())
                            .district(pr.getOrganization().getAddress().getDistrict())
                            .streetAddress(pr.getOrganization().getAddress().getStreetAddress())
                            .fullAddress(pr.getOrganization().getAddress().getFullAddress())
                            .build() : null)
                    .phone(pr.getOrganization().getPhone())
                    .email(pr.getOrganization().getEmail())
                    .isActive(pr.getOrganization().getIsActive())
                    .createdAt(pr.getOrganization().getCreatedAt())
                    .build();
        }
        
        return PaymentReceiverDto.builder()
                .id(pr.getId())
                .fullName(pr.getFullName())
                .cardNumber(pr.getCardNumber())
                .cardHolder(pr.getCardHolder())
                .telegramUsername(pr.getTelegramUsername())
                .telegramChatId(pr.getTelegramChatId())
                .paymentPurpose(pr.getPaymentPurpose())
                .active(pr.getIsActive())
                .isDefault(pr.getIsDefault())
                .organization(orgDto)
                .createdAt(pr.getCreatedAt())
                .build();
    }
}
