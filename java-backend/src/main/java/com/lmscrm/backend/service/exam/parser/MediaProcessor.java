package com.lmscrm.backend.service.exam.parser;

import com.lmscrm.backend.dto.exam.parser.ParseResult;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * MediaProcessor — Processes all media assets extracted during parsing.
 *
 * For each MediaAsset:
 *   1. Assigns a stable UUID ref ID
 *   2. Computes sha256 hash
 *   3. Detects MIME type
 *   4. Reads image dimensions (width, height) if applicable
 *   5. Saves binary to filesystem: archive/media/{uuid}.{ext}
 *   6. Sets uploadedUrl for use in Question entity
 */
@Service
@Slf4j
public class MediaProcessor {

    private static final String MEDIA_DIR = "archive/media/";

    public void processAll(ParseResult result) {
        if (result.getMediaAssets() == null || result.getMediaAssets().isEmpty()) return;

        ensureDirectoryExists(MEDIA_DIR);

        for (ParseResult.MediaAsset asset : result.getMediaAssets()) {
            try {
                process(asset);
            } catch (Exception e) {
                log.warn("Failed to process media asset {}: {}", asset.getRefId(), e.getMessage());
            }
        }
    }

    private void process(ParseResult.MediaAsset asset) throws IOException {
        byte[] data = asset.getBinaryData();
        if (data == null || data.length == 0) return;

        // 1. Ensure UUID ref
        if (asset.getRefId() == null || asset.getRefId().isBlank()) {
            asset.setRefId(UUID.randomUUID().toString());
        }

        // 2. Hash
        asset.setSha256Hash(DigestUtils.sha256Hex(data));
        asset.setSizeBytes((long) data.length);

        // 3. MIME type detection
        if (asset.getMimeType() == null || asset.getMimeType().isBlank()) {
            asset.setMimeType(detectMimeType(data));
        }

        // 4. Image dimensions
        if (asset.getMimeType() != null && asset.getMimeType().startsWith("image/")) {
            try {
                BufferedImage img = ImageIO.read(new ByteArrayInputStream(data));
                if (img != null) {
                    asset.setWidth(img.getWidth());
                    asset.setHeight(img.getHeight());
                }
            } catch (Exception e) {
                log.debug("Could not read image dimensions for {}", asset.getRefId());
            }
        }

        // 5. Save to filesystem
        String ext = getExtension(asset.getMimeType());
        String fileName = asset.getRefId() + "." + ext;
        Path filePath = Paths.get(MEDIA_DIR + fileName);
        Files.write(filePath, data);

        // 6. Set public URL
        asset.setUploadedUrl("/api/v1/media/" + asset.getRefId());

        log.info("Media processed: {} ({} bytes, {}x{})",
                asset.getRefId(), data.length, asset.getWidth(), asset.getHeight());
    }

    private String detectMimeType(byte[] data) {
        if (data.length < 4) return "application/octet-stream";
        // PNG: 89 50 4E 47
        if (data[0] == (byte)0x89 && data[1] == 0x50) return "image/png";
        // JPEG: FF D8 FF
        if (data[0] == (byte)0xFF && data[1] == (byte)0xD8) return "image/jpeg";
        // GIF: 47 49 46
        if (data[0] == 0x47 && data[1] == 0x49 && data[2] == 0x46) return "image/gif";
        // WebP: 52 49 46 46
        if (data[0] == 0x52 && data[1] == 0x49 && data[2] == 0x46 && data[3] == 0x46) return "image/webp";
        // MP3: FF FB or ID3
        if ((data[0] == (byte)0xFF && data[1] == (byte)0xFB) ||
            (data[0] == 0x49 && data[1] == 0x44 && data[2] == 0x33)) return "audio/mpeg";
        // WAV: 52 49 46 46 ... 57 41 56 45
        if (data[0] == 0x52 && data[1] == 0x49 && data[2] == 0x46 && data[3] == 0x46) return "audio/wav";
        return "application/octet-stream";
    }

    private String getExtension(String mimeType) {
        if (mimeType == null) return "bin";
        return switch (mimeType) {
            case "image/png"  -> "png";
            case "image/jpeg" -> "jpg";
            case "image/gif"  -> "gif";
            case "image/webp" -> "webp";
            case "image/svg+xml" -> "svg";
            case "audio/mpeg" -> "mp3";
            case "audio/wav"  -> "wav";
            default           -> "bin";
        };
    }

    private void ensureDirectoryExists(String dir) {
        try { Files.createDirectories(Paths.get(dir)); }
        catch (IOException e) { log.warn("Could not create media dir: {}", dir); }
    }
}
