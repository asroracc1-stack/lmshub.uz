package com.lmscrm.backend.service.parent;

import com.lmscrm.backend.domain.entity.ParentStudentLink;
import com.lmscrm.backend.domain.entity.Profile;
import com.lmscrm.backend.domain.entity.Group;
import com.lmscrm.backend.repository.GroupRepository;
import com.lmscrm.backend.repository.ParentStudentLinkRepository;
import com.lmscrm.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ParentService {

    private final ParentStudentLinkRepository linkRepository;
    private final ProfileRepository profileRepository;
    private final GroupRepository groupRepository;

    public List<Profile> getMyChildren(UUID parentId) {
        List<ParentStudentLink> links = linkRepository.findAllByParentId(parentId);
        List<UUID> studentIds = links.stream()
                .map(link -> link.getStudent().getId())
                .collect(Collectors.toList());
        
        return profileRepository.findAllById(studentIds);
    }

    public boolean isMyChild(UUID parentId, UUID studentId) {
        return linkRepository.existsByParentIdAndStudentId(parentId, studentId);
    }

    public List<Profile> getMyTeachers(UUID parentId) {
        List<ParentStudentLink> links = linkRepository.findAllByParentId(parentId);
        
        List<UUID> groupIds = links.stream()
                .map(link -> link.getStudent().getGroupId())
                .filter(id -> id != null)
                .distinct()
                .collect(Collectors.toList());

        List<UUID> teacherIds = groupRepository.findAllById(groupIds).stream()
                .map(Group::getTeacherId)
                .filter(id -> id != null)
                .distinct()
                .collect(Collectors.toList());
                
        return profileRepository.findAllById(teacherIds);
    }
}
