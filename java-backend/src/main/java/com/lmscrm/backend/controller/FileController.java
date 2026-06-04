package com.lmscrm.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.http.MediaType;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import java.awt.image.BufferedImage;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;

import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.repository.UserRepository;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import com.lmscrm.backend.repository.ProfileRepository;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@Tag(name = "File Controller", description = "Endpoints for file uploads")
public class FileController {

    private final String uploadDir = "uploads/";
    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;

    @PostMapping("/upload")
    @Operation(summary = "Upload File")
    public ResponseEntity<String> upload(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        Path root = Paths.get(uploadDir);
        if (!Files.exists(root)) {
            Files.createDirectories(root);
        }

        String filename = UUID.randomUUID() + "-" + file.getOriginalFilename();
        Files.copy(file.getInputStream(), root.resolve(filename));

        // In a real app, this would be a full URL
        String url = "/api/v1/files/view/" + filename;
        return ResponseEntity.ok(url);
    }

    @GetMapping("/view/{filename}")
    @Operation(summary = "View File")
    public ResponseEntity<byte[]> view(@PathVariable String filename) throws IOException {
        Path file = Paths.get(uploadDir).resolve(filename);
        if (!Files.exists(file)) {
            return ResponseEntity.notFound().build();
        }
        String mimeType = Files.probeContentType(file);
        if (mimeType == null) {
            mimeType = "application/octet-stream";
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mimeType))
                .body(Files.readAllBytes(file));
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

        Path avatarPath = Paths.get(uploadDir, "avatars");
        if (!Files.exists(avatarPath)) {
            Files.createDirectories(avatarPath);
        }

        String filename = "avatar-" + user.getId() + "-" + System.currentTimeMillis() + ".jpg";
        Path targetFile = avatarPath.resolve(filename);

        // Compress and save as JPG
        Thumbnails.of(file.getInputStream())
                .size(400, 400)
                .outputFormat("jpg")
                .outputQuality(0.8)
                .toFile(targetFile.toFile());

        String url = "/api/v1/files/view/avatars/" + filename;

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
            // ── Guard checks ──────────────────────────────────
            if (user == null) {
                log.warn("⚠️ uploadProfile called without authenticated user");
                return ResponseEntity.status(401).body("Foydalanuvchi aniqlanmadi");
            }
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body("Fayl bo'sh yoki yuborilmagan");
            }

            log.info("📁 Starting Profile Upload for user: {}", user.getId());

            // ── Ensure upload directory exists ────────────────
            Path logoPath = Paths.get(uploadDir, "logos");
            if (!Files.exists(logoPath)) {
                Files.createDirectories(logoPath);
                log.info("📂 Created logos directory: {}", logoPath.toAbsolutePath());
            }

            // ── Save file ─────────────────────────────────────
            String filename = "profile-" + user.getId() + "-" + System.currentTimeMillis() + ".webp";
            Path targetFile = logoPath.resolve(filename).toAbsolutePath();
            Files.copy(file.getInputStream(), targetFile, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            log.info("✅ Saved profile image: {}", targetFile);

            String url = "/api/v1/files/view/logos/" + filename;

            // ── Update User.avatarUrl ─────────────────────────
            User managedUser = userRepository.findById(user.getId())
                    .orElseThrow(() -> new RuntimeException("Foydalanuvchi topilmadi: " + user.getId()));
            managedUser.setAvatarUrl(url);
            userRepository.save(managedUser);
            log.info("✅ Updated user avatarUrl");

            // ── Update Profile.avatarUrl (safe: may not exist) ─
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

    @GetMapping("/view/logos/{filename}")
    @Operation(summary = "View Logo")
    public ResponseEntity<byte[]> viewLogo(@PathVariable String filename) {
        try {
            Path file = Paths.get(uploadDir, "logos").resolve(filename);
            if (!Files.exists(file)) {
                log.warn("🔍 Logo not found: {}", filename);
                return ResponseEntity.notFound().build();
            }
            log.info("🖼️ Serving logo: {}", filename);
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.parseMediaType("image/webp"))
                    .body(Files.readAllBytes(file));
        } catch (Exception e) {
            log.error("❌ Error serving logo {}: {}", filename, e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/view/receipts/{filename}")
    @Operation(summary = "View Receipt")
    public ResponseEntity<byte[]> viewReceipt(@PathVariable String filename) {
        try {
            Path file = Paths.get(uploadDir, "receipts").resolve(filename);
            if (!Files.exists(file)) {
                log.warn("Receipt not found: {}", filename);
                return ResponseEntity.notFound().build();
            }
            String mimeType = Files.probeContentType(file);
            if (mimeType == null) mimeType = "image/png";
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.parseMediaType(mimeType))
                    .body(Files.readAllBytes(file));
        } catch (Exception e) {
            log.error("❌ Error serving receipt {}: {}", filename, e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }
}
