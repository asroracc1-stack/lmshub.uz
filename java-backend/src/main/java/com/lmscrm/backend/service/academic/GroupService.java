package com.lmscrm.backend.service.academic;

import com.lmscrm.backend.domain.entity.Group;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.enums.AppRole;
import com.lmscrm.backend.dto.academic.GroupDto;
import com.lmscrm.backend.exception.ResourceNotFoundException;
import com.lmscrm.backend.mapper.AcademicMapper;
import com.lmscrm.backend.repository.GroupRepository;
import com.lmscrm.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final AcademicMapper mapper;

    @Transactional(readOnly = true)
    public Page<GroupDto> getAllGroups(String query, Pageable pageable, User currentUser) {
        boolean isSuper = currentUser.getRole() == AppRole.SUPER_ADMIN;
        UUID orgId = currentUser.getOrganizationId();

        Page<Group> groups;
        if (isSuper) {
            groups = groupRepository.findAll(pageable);
        } else {
            groups = groupRepository.findByOrganizationId(orgId, pageable);
        }

        return groups.map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public List<GroupDto> getTeacherGroups(UUID teacherId) {
        return groupRepository.findByTeacherId(teacherId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<GroupDto> getAllGroupsByOrganization(UUID orgId) {
        return groupRepository.findByOrganizationId(orgId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public GroupDto getGroupWithTeachers(UUID id) {
        Group group = groupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));
        return mapToDto(group);
    }

    @Transactional
    public GroupDto createGroup(GroupDto dto, User currentUser) {
        UUID orgId = (currentUser.getRole() == AppRole.SUPER_ADMIN) ? dto.getOrganizationId() : currentUser.getOrganizationId();
        
        if (orgId == null) {
            throw new IllegalArgumentException("Tashkilot aniqlanmadi (Organization ID is required)");
        }

        Group group = Group.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .direction(dto.getDirection())
                .teacherId(dto.getTeacherId())
                .color(dto.getColor() != null ? dto.getColor() : "#10b981")
                .isActive(true)
                .organization(com.lmscrm.backend.domain.entity.Organization.builder().id(orgId).build())
                .createdBy(currentUser)
                .build();
        
        return mapToDto(groupRepository.save(group));
    }

    @Transactional
    public GroupDto updateGroup(UUID id, GroupDto dto, User currentUser) {
        Group group = groupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));

        // Security check
        if (currentUser.getRole() != AppRole.SUPER_ADMIN && !group.getOrganization().getId().equals(currentUser.getOrganizationId())) {
            throw new RuntimeException("Ruxsat etilmagan harakat!");
        }

        group.setName(dto.getName());
        group.setDescription(dto.getDescription());
        group.setDirection(dto.getDirection());
        group.setTeacherId(dto.getTeacherId());
        if (dto.getColor() != null) group.setColor(dto.getColor());
        if (dto.getIsActive() != null) group.setIsActive(dto.getIsActive());

        return mapToDto(groupRepository.save(group));
    }

    @Transactional
    public void deleteGroup(UUID id, User currentUser) {
        Group group = groupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found"));

        if (currentUser.getRole() != AppRole.SUPER_ADMIN && !group.getOrganization().getId().equals(currentUser.getOrganizationId())) {
            throw new RuntimeException("Ruxsat etilmagan harakat!");
        }

        groupRepository.delete(group);
    }

    private GroupDto mapToDto(Group group) {
        GroupDto dto = mapper.toGroupDto(group);
        dto.setStudentCount(userRepository.countByGroupId(group.getId()));
        return dto;
    }
}
