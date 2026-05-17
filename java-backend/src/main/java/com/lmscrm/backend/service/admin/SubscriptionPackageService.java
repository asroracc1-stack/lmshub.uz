package com.lmscrm.backend.service.admin;

import com.lmscrm.backend.domain.entity.SubscriptionPackage;
import com.lmscrm.backend.dto.admin.SubscriptionPackageDto;
import com.lmscrm.backend.repository.OrganizationRepository;
import com.lmscrm.backend.repository.SubscriptionPackageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubscriptionPackageService {
    private final SubscriptionPackageRepository repository;
    private final OrganizationRepository organizationRepository;

    public List<SubscriptionPackageDto> getAll() {
        return repository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    public SubscriptionPackageDto create(SubscriptionPackageDto dto) {
        SubscriptionPackage sp = SubscriptionPackage.builder()
            .name(dto.getName())
            .description(dto.getDescription())
            .price(dto.getPrice())
            .maxOrganizations(dto.getMaxOrganizations())
            .maxStudents(dto.getMaxStudents())
            .maxTeachers(dto.getMaxTeachers())
            .build();
        return toDto(repository.save(sp));
    }

    public SubscriptionPackageDto update(UUID id, SubscriptionPackageDto dto) {
        SubscriptionPackage sp = repository.findById(id)
            .orElseThrow(() -> new RuntimeException("Tarif topilmadi"));
        sp.setName(dto.getName());
        sp.setDescription(dto.getDescription());
        sp.setPrice(dto.getPrice());
        sp.setMaxOrganizations(dto.getMaxOrganizations());
        sp.setMaxStudents(dto.getMaxStudents());
        sp.setMaxTeachers(dto.getMaxTeachers());
        return toDto(repository.save(sp));
    }

    public void delete(UUID id) {
        long orgCount = organizationRepository.countBySubscriptionPackageId(id);
        if (orgCount > 0) {
            throw new RuntimeException("Ushbu tarifga ulangan " + orgCount + " ta tashkilot mavjud. O'chirib bo'lmaydi.");
        }
        repository.deleteById(id);
    }

    private SubscriptionPackageDto toDto(SubscriptionPackage sp) {
        return SubscriptionPackageDto.builder()
            .id(sp.getId())
            .name(sp.getName())
            .description(sp.getDescription())
            .price(sp.getPrice())
            .maxOrganizations(sp.getMaxOrganizations())
            .maxStudents(sp.getMaxStudents())
            .maxTeachers(sp.getMaxTeachers())
            .build();
    }
}
