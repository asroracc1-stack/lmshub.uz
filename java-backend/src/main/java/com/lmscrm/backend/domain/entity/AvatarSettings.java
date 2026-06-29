package com.lmscrm.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "avatar_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvatarSettings {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "avatar_id")
    @Builder.Default
    private String avatarId = "avatar-robby";

    @Column(name = "voice_id")
    @Builder.Default
    private String voiceId = "voice-conversational";

    @Column(name = "input_device_id")
    @Builder.Default
    private String inputDeviceId = "mic-default";

    @Column(name = "output_device_id")
    @Builder.Default
    private String outputDeviceId = "audio-default";

    @Column(name = "camera_device_id")
    @Builder.Default
    private String cameraDeviceId = "cam-default";
}
