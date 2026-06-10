package com.lmscrm.backend.service.storage;

import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

public interface FileStorageService {
    /**
     * Stores a file and returns its public URL
     */
    String storeFile(MultipartFile file, String subFolder) throws IOException;

    /**
     * Deletes a file by its URL
     */
    void deleteFile(String fileUrl);
}
