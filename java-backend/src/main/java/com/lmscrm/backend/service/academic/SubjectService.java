package com.lmscrm.backend.service.academic;

import com.lmscrm.backend.domain.entity.Organization;
import com.lmscrm.backend.domain.entity.Subject;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.dto.academic.SubjectDto;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.mapper.AcademicMapper;
import com.lmscrm.backend.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final AcademicMapper mapper;

    @Transactional(readOnly = true)
    public List<SubjectDto> getAllSubjectsByOrganization(UUID orgId) {
        return subjectRepository.findByOrganizationId(orgId).stream()
                .map(mapper::toSubjectDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SubjectDto getSubjectById(UUID id) {
        Subject subject = subjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));
        return mapper.toSubjectDto(subject);
    }

    @Transactional
    public SubjectDto createSubject(SubjectDto dto, User currentUser) {
        UUID orgId = (currentUser.getRole() == AppRole.SUPER_ADMIN) ? currentUser.getOrganizationId() : currentUser.getOrganizationId();
        if (orgId == null) {
            throw new IllegalArgumentException("Organization ID is required");
        }

        Subject subject = Subject.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .organization(Organization.builder().id(orgId).build())
                .build();

        return mapper.toSubjectDto(subjectRepository.save(subject));
    }

    @Transactional
    public SubjectDto updateSubject(UUID id, SubjectDto dto, User currentUser) {
        Subject subject = subjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

        if (currentUser.getRole() != AppRole.SUPER_ADMIN && !subject.getOrganization().getId().equals(currentUser.getOrganizationId())) {
            throw new RuntimeException("Unauthorized access");
        }

        subject.setName(dto.getName());
        subject.setDescription(dto.getDescription());

        return mapper.toSubjectDto(subjectRepository.save(subject));
    }

    @Transactional
    public void deleteSubject(UUID id, User currentUser) {
        Subject subject = subjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found"));

        if (currentUser.getRole() != AppRole.SUPER_ADMIN && !subject.getOrganization().getId().equals(currentUser.getOrganizationId())) {
            throw new RuntimeException("Unauthorized access");
        }

        subjectRepository.delete(subject);
    }
}
