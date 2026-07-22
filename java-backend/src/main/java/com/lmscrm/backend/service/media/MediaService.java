package com.lmscrm.backend.service.media;

import com.lmscrm.backend.domain.entity.MediaAsset;
import com.lmscrm.backend.repository.MediaAssetRepository;
import com.lmscrm.backend.service.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class MediaService {

    private final MediaAssetRepository mediaAssetRepository;
    private final FileStorageService fileStorageService;

    @Transactional
    public String uploadMedia(MultipartFile file, String subFolder) throws IOException {
        byte[] bytes = file.getBytes();
        String hash = calculateSha256(bytes);

        Optional<MediaAsset> existing = mediaAssetRepository.findByFileHash(hash);
        if (existing.isPresent()) {
            log.info("Duplicate media file detected by hash: {}. Reusing URL: {}", hash, existing.get().getUrl());
            return existing.get().getUrl();
        }

        log.info("Uploading new media file: {}. Hash: {}", file.getOriginalFilename(), hash);
        String url = fileStorageService.storeFile(file, subFolder);

        MediaAsset asset = MediaAsset.builder()
                .fileHash(hash)
                .filename(file.getOriginalFilename())
                .fileSize(file.getSize())
                .url(url)
                .mimeType(file.getContentType())
                .build();
        mediaAssetRepository.save(asset);

        return url;
    }

    private String calculateSha256(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
