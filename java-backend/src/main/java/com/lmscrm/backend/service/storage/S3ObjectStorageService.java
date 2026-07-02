package com.lmscrm.backend.service.storage;

import com.amazonaws.HttpMethod;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.GeneratePresignedUrlRequest;
import com.amazonaws.services.s3.model.ObjectMetadata;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.ByteArrayInputStream;
import java.net.URL;
import java.time.Instant;
import java.util.Date;

@Service
@RequiredArgsConstructor
@Slf4j
public class S3ObjectStorageService {

    private final AmazonS3 s3Client;

    @Value("${aws.s3.bucket:lmshub-attendance}")
    private String bucketName;

    /**
     * Upload raw bytes to S3 object storage.
     * Automatically creates bucket if it does not exist.
     */
    public String uploadFile(String objectKey, byte[] data, String contentType) {
        try {
            if (!s3Client.doesBucketExistV2(bucketName)) {
                s3Client.createBucket(bucketName);
            }

            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentLength(data.length);
            metadata.setContentType(contentType);

            try (ByteArrayInputStream inputStream = new ByteArrayInputStream(data)) {
                s3Client.putObject(bucketName, objectKey, inputStream, metadata);
            }

            return objectKey;
        } catch (Exception e) {
            log.error("Failed to upload file to S3: {}", objectKey, e);
            throw new RuntimeException("S3 upload failed", e);
        }
    }

    /**
     * Generates a pre-signed URL with short TTL (e.g. 10 minutes) for secure access.
     */
    public String getPresignedUrl(String objectKey, int expirationMinutes) {
        try {
            Instant expiration = Instant.now().plusSeconds(expirationMinutes * 60L);
            
            GeneratePresignedUrlRequest request = new GeneratePresignedUrlRequest(bucketName, objectKey)
                    .withMethod(HttpMethod.GET)
                    .withExpiration(Date.from(expiration));
                    
            URL url = s3Client.generatePresignedUrl(request);
            return url.toString();
        } catch (Exception e) {
            log.error("Failed to generate presigned URL for S3 key: {}", objectKey, e);
            return null;
        }
    }

    /**
     * Delete object from S3.
     */
    public void deleteFile(String objectKey) {
        try {
            if (s3Client.doesObjectExist(bucketName, objectKey)) {
                s3Client.deleteObject(bucketName, objectKey);
            }
        } catch (Exception e) {
            log.error("Failed to delete S3 object: {}", objectKey, e);
        }
    }
}
