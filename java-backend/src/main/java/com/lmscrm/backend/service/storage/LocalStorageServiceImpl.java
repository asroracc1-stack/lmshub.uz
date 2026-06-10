package com.lmscrm.backend.service.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class LocalStorageServiceImpl implements FileStorageService {

    private final Path fileStorageLocation;
    private final String baseUrl;

    public LocalStorageServiceImpl(@Value("${file.upload-dir:./uploads}") String uploadDir,
                                   @Value("${file.base-url:http://localhost:8080/uploads/}") String baseUrl) {
        this.baseUrl = baseUrl;
        Path tempPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(tempPath);
            this.fileStorageLocation = tempPath;
        } catch (Exception ex) {
            System.err.println("Could not create the primary directory for uploads. Falling back to /tmp/uploads");
            this.fileStorageLocation = Paths.get("/tmp/uploads").toAbsolutePath().normalize();
            try {
                Files.createDirectories(this.fileStorageLocation);
            } catch (Exception e) {
                System.err.println("Could not create fallback directory either. Uploads will fail.");
            }
        }
    }

    @Override
    public String storeFile(MultipartFile file, String subFolder) throws IOException {
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        String extension = "";
        int i = originalFileName.lastIndexOf('.');
        if (i > 0) {
            extension = originalFileName.substring(i);
        }
        
        String newFileName = UUID.randomUUID().toString() + extension;
        Path targetLocation = this.fileStorageLocation;
        
        if (subFolder != null && !subFolder.isEmpty()) {
            targetLocation = this.fileStorageLocation.resolve(subFolder);
            if (!Files.exists(targetLocation)) {
                Files.createDirectories(targetLocation);
            }
        }
        
        targetLocation = targetLocation.resolve(newFileName);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        String relativeUrl = (subFolder != null && !subFolder.isEmpty()) ? subFolder + "/" + newFileName : newFileName;
        return baseUrl + relativeUrl;
    }

    @Override
    public void deleteFile(String fileUrl) {
        if (fileUrl != null && fileUrl.startsWith(baseUrl)) {
            String relativePath = fileUrl.substring(baseUrl.length());
            Path targetLocation = this.fileStorageLocation.resolve(relativePath).normalize();
            try {
                Files.deleteIfExists(targetLocation);
            } catch (IOException e) {
                // Log exception
            }
        }
    }
}
