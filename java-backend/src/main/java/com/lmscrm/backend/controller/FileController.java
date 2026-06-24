package com.lmscrm.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;
import java.util.UUID;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.domain.entity.DbStoredFile;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.repository.ProfileRepository;
import com.lmscrm.backend.repository.DbStoredFileRepository;
import net.coobird.thumbnailator.Thumbnails;

@Slf4j
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@Tag(name = "File Controller", description = "Endpoints for hybrid file uploads and secure range-based streaming")
public class FileController {

    private final String uploadDir = "uploads/";
    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final DbStoredFileRepository dbStoredFileRepository;

    @PostMapping("/upload")
    @Operation(summary = "Upload File (Hybrid Store)")
    public ResponseEntity<String> upload(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }
        String url = storeFileHybrid(file, null);
        return ResponseEntity.ok(url);
    }

    @GetMapping("/view/{filename}")
    @Operation(summary = "View File")
    public ResponseEntity<Resource> view(@PathVariable String filename) {
        return serveFile(filename, null);
    }

    @GetMapping("/view/logos/{filename}")
    @Operation(summary = "View Logo")
    public ResponseEntity<Resource> viewLogo(@PathVariable String filename) {
        return serveFile(filename, "logos");
    }

    @GetMapping("/view/receipts/{filename}")
    @Operation(summary = "View Receipt")
    public ResponseEntity<Resource> viewReceipt(@PathVariable String filename) {
        return serveFile(filename, "receipts");
    }

    @GetMapping("/view/avatars/{filename}")
    @Operation(summary = "View Avatar")
    public ResponseEntity<Resource> viewAvatar(@PathVariable String filename) {
        return serveFile(filename, "avatars");
    }

    @PostMapping("/upload/avatar")
    @Transactional
    @Operation(summary = "Upload Avatar with Compression")
    public ResponseEntity<String> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) throws IOException {
        
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        // Compress and save as JPG
        ByteArrayOutputStream os = new ByteArrayOutputStream();
        Thumbnails.of(file.getInputStream())
                .size(400, 400)
                .outputFormat("jpg")
                .outputQuality(0.8)
                .toOutputStream(os);
        byte[] data = os.toByteArray();

        String filename = "avatar-" + user.getId() + "-" + System.currentTimeMillis() + ".jpg";
        String url = storeBytesHybrid(data, filename, "image/jpeg", "avatars");

        // Fetch and update User
        User managedUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        managedUser.setAvatarUrl(url);
        userRepository.save(managedUser);

        // Fetch and update Profile
        profileRepository.findById(user.getId()).ifPresent(p -> {
            p.setAvatarUrl(url);
            profileRepository.save(p);
        });

        return ResponseEntity.ok(url);
    }

    @PostMapping("/upload/profile")
    @Transactional
    @Operation(summary = "Upload Cropped Profile/Logo as WebP")
    public ResponseEntity<String> uploadProfile(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) {

        try {
            if (user == null) {
                log.warn("⚠️ uploadProfile called without authenticated user");
                return ResponseEntity.status(401).body("Foydalanuvchi aniqlanmadi");
            }
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body("Fayl bo'sh yoki yuborilmagan");
            }

            log.info("📁 Starting Profile Upload for user: {}", user.getId());

            String filename = "profile-" + user.getId() + "-" + System.currentTimeMillis() + ".webp";
            byte[] bytes = file.getBytes();
            String url = storeBytesHybrid(bytes, filename, "image/webp", "logos");

            // Update User
            User managedUser = userRepository.findById(user.getId())
                    .orElseThrow(() -> new RuntimeException("Foydalanuvchi topilmadi: " + user.getId()));
            managedUser.setAvatarUrl(url);
            userRepository.save(managedUser);

            // Update Profile
            profileRepository.findByUser(managedUser).ifPresent(p -> {
                p.setAvatarUrl(url);
                profileRepository.save(p);
                log.info("✅ Updated profile avatarUrl");
            });

            return ResponseEntity.ok(url);

        } catch (Exception e) {
            log.error("💥 uploadProfile error: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Rasmni saqlashda xatolik: " + e.getMessage());
        }
    }

    // ─── HYBRID STORAGE UTILITIES ─────────────────────────────────────────────

    private String storeFileHybrid(MultipartFile file, String subFolder) throws IOException {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            originalFilename = "file";
        }
        
        // Clean original filename, keeping only safe alphanumeric characters, dashes, and dots
        String cleanedFilename = UUID.randomUUID().toString() + "-" + originalFilename.replaceAll("[^a-zA-Z0-9.-]", "_");
        String dbKey = (subFolder != null && !subFolder.isEmpty()) ? subFolder + "/" + cleanedFilename : cleanedFilename;
        
        String mimeType = file.getContentType();
        if (mimeType == null) {
            mimeType = getMimeTypeFallback(cleanedFilename);
        }
        long size = file.getSize();

        // Hybrid storage rule: < 2MB to DB, >= 2MB to File System
        if (size < 2 * 1024 * 1024) {
            byte[] data = file.getBytes();
            DbStoredFile storedFile = DbStoredFile.builder()
                    .filename(dbKey)
                    .contentType(mimeType)
                    .fileSize(size)
                    .storageType("DB")
                    .data(data)
                    .build();
            dbStoredFileRepository.save(storedFile);
            log.info("💾 Stored small file <2MB in DB: {}", dbKey);
        } else {
            Path targetDir = Paths.get(uploadDir);
            if (subFolder != null && !subFolder.isEmpty()) {
                targetDir = targetDir.resolve(subFolder);
            }
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
            }
            Path targetPath = targetDir.resolve(cleanedFilename);
            Files.copy(file.getInputStream(), targetPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            DbStoredFile storedFile = DbStoredFile.builder()
                    .filename(dbKey)
                    .contentType(mimeType)
                    .fileSize(size)
                    .storageType("LOCAL")
                    .path(targetPath.toString())
                    .build();
            dbStoredFileRepository.save(storedFile);
            log.info("📁 Stored large file >=2MB on local disk: {}", targetPath);
        }

        if (subFolder != null && !subFolder.isEmpty()) {
            return "/api/v1/files/view/" + subFolder + "/" + cleanedFilename;
        } else {
            return "/api/v1/files/view/" + cleanedFilename;
        }
    }

    private String storeBytesHybrid(byte[] data, String filename, String contentType, String subFolder) throws IOException {
        long size = data.length;
        String dbKey = (subFolder != null && !subFolder.isEmpty()) ? subFolder + "/" + filename : filename;

        // Hybrid storage rule for raw bytes
        if (size < 2 * 1024 * 1024) {
            DbStoredFile storedFile = DbStoredFile.builder()
                    .filename(dbKey)
                    .contentType(contentType)
                    .fileSize(size)
                    .storageType("DB")
                    .data(data)
                    .build();
            dbStoredFileRepository.save(storedFile);
            log.info("💾 Stored small byte payload <2MB in DB: {}", dbKey);
        } else {
            Path targetDir = Paths.get(uploadDir);
            if (subFolder != null && !subFolder.isEmpty()) {
                targetDir = targetDir.resolve(subFolder);
            }
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
            }
            Path targetPath = targetDir.resolve(filename);
            Files.write(targetPath, data);

            DbStoredFile storedFile = DbStoredFile.builder()
                    .filename(dbKey)
                    .contentType(contentType)
                    .fileSize(size)
                    .storageType("LOCAL")
                    .path(targetPath.toString())
                    .build();
            dbStoredFileRepository.save(storedFile);
            log.info("📁 Stored large byte payload >=2MB on local disk: {}", targetPath);
        }

        if (subFolder != null && !subFolder.isEmpty()) {
            return "/api/v1/files/view/" + subFolder + "/" + filename;
        } else {
            return "/api/v1/files/view/" + filename;
        }
    }

    private ResponseEntity<Resource> serveFile(String filename, String subFolder) {
        String dbKey = (subFolder != null && !subFolder.isEmpty()) ? subFolder + "/" + filename : filename;

        Optional<DbStoredFile> opt = dbStoredFileRepository.findByFilename(dbKey);
        if (opt.isPresent()) {
            DbStoredFile storedFile = opt.get();
            String etag = "\"" + storedFile.getFilename() + "-" + storedFile.getFileSize() + "\"";

            if ("DB".equals(storedFile.getStorageType())) {
                Resource resource = new ByteArrayResource(storedFile.getData()) {
                    @Override
                    public String getFilename() {
                        return filename;
                    }
                };
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(storedFile.getContentType()))
                        .header(HttpHeaders.CACHE_CONTROL, "max-age=31536000, must-revalidate")
                        .eTag(etag)
                        .body(resource);
            } else {
                Path path = Paths.get(storedFile.getPath());
                if (Files.exists(path)) {
                    Resource resource = new FileSystemResource(path);
                    return ResponseEntity.ok()
                            .contentType(MediaType.parseMediaType(storedFile.getContentType()))
                            .header(HttpHeaders.CACHE_CONTROL, "max-age=31536000, must-revalidate")
                            .eTag(etag)
                            .body(resource);
                }
            }
        }

        // Fallback for legacy files
        try {
            Path file = Paths.get(uploadDir);
            if (subFolder != null && !subFolder.isEmpty()) {
                file = file.resolve(subFolder);
            }
            file = file.resolve(filename);

            if (!Files.exists(file)) {
                // Try target directory or java-backend path
                Path backup = Paths.get("java-backend/" + uploadDir);
                if (subFolder != null && !subFolder.isEmpty()) {
                    backup = backup.resolve(subFolder);
                }
                backup = backup.resolve(filename);
                if (Files.exists(backup)) {
                    file = backup;
                } else {
                    log.warn("🔍 Requested file not found in DB or filesystem fallback: {}", dbKey);
                    return ResponseEntity.notFound().build();
                }
            }

            String mimeType = Files.probeContentType(file);
            if (mimeType == null) {
                mimeType = getMimeTypeFallback(filename);
            }
            Resource resource = new FileSystemResource(file);
            String etag = "\"" + filename + "-" + Files.size(file) + "\"";
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(mimeType))
                    .header(HttpHeaders.CACHE_CONTROL, "max-age=31536000, must-revalidate")
                    .eTag(etag)
                    .body(resource);
        } catch (IOException e) {
            log.error("💥 Error serving legacy file {}: {}", dbKey, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private String getMimeTypeFallback(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".pdf")) return "application/pdf";
        return "application/octet-stream";
    }
}
