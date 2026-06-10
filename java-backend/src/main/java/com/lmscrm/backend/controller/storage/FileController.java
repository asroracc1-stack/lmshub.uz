package com.lmscrm.backend.controller.storage;

import com.lmscrm.backend.service.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/storage")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file,
                                        @RequestParam(value = "type", defaultValue = "general") String type) {
        try {
            String folder = type; // e.g. "voice", "document", "photo"
            String url = fileStorageService.storeFile(file, folder);
            return ResponseEntity.ok(Map.of("url", url, "success", true));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage(), "success", false));
        }
    }
}
