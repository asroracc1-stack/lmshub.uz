package com.lmscrm.backend.service.exam.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lmscrm.backend.dto.exam.parser.ParseResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import java.util.stream.Collectors;

/**
 * ImportArchiveService — Archives original HTML + media into a ZIP file.
 *
 * ZIP structure:
 *   exam.zip
 *     ├── html/{fileName}
 *     ├── media/{uuid}.{ext}    (one per media asset)
 *     └── manifest.json
 *
 * DB (ImportLog) stores only the storagePath.
 * HTML and media are NEVER stored as BLOBs in DB.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImportArchiveService {

    private static final String ARCHIVE_BASE = "archive/imports/";
    private final ObjectMapper objectMapper;

    /**
     * Archives original HTML and media into a ZIP file.
     *
     * @return path to the ZIP file
     */
    public String archive(UUID examId,
                           byte[] htmlBytes,
                           String fileName,
                           List<ParseResult.MediaAsset> mediaAssets) throws IOException {

        String examDir = ARCHIVE_BASE + examId + "/";
        Files.createDirectories(Paths.get(examDir));

        String zipPath = examDir + "exam.zip";

        try (ZipOutputStream zip = new ZipOutputStream(new FileOutputStream(zipPath))) {

            // 1. Original HTML
            zip.putNextEntry(new ZipEntry("html/" + fileName));
            zip.write(htmlBytes);
            zip.closeEntry();

            // 2. Media files
            if (mediaAssets != null) {
                for (ParseResult.MediaAsset asset : mediaAssets) {
                    if (asset.getBinaryData() != null && asset.getBinaryData().length > 0) {
                        String ext = getExtension(asset.getMimeType());
                        String entryName = "media/" + asset.getRefId() + "." + ext;
                        zip.putNextEntry(new ZipEntry(entryName));
                        zip.write(asset.getBinaryData());
                        zip.closeEntry();
                    }
                }
            }

            // 3. manifest.json
            String manifest = buildManifest(examId, fileName, mediaAssets);
            zip.putNextEntry(new ZipEntry("manifest.json"));
            zip.write(manifest.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }

        log.info("Archived exam {} to: {}", examId, zipPath);
        return zipPath;
    }

    private String buildManifest(UUID examId, String fileName,
                                  List<ParseResult.MediaAsset> mediaAssets) {
        try {
            Map<String, Object> manifest = new HashMap<>();
            manifest.put("lmsHubArchiveVersion", "1.0");
            manifest.put("examId", examId.toString());
            manifest.put("importedAt", LocalDateTime.now().toString());
            manifest.put("htmlFile", "html/" + fileName);

            List<Map<String, String>> mediaList = List.of();
            if (mediaAssets != null) {
                mediaList = mediaAssets.stream().map(a -> {
                    Map<String, String> m = new HashMap<>();
                    m.put("refId", a.getRefId());
                    m.put("originalName", a.getOriginalName() != null ? a.getOriginalName() : "");
                    m.put("mimeType", a.getMimeType() != null ? a.getMimeType() : "");
                    m.put("sha256", a.getSha256Hash() != null ? a.getSha256Hash() : "");
                    return m;
                }).collect(Collectors.toList());
            }
            manifest.put("mediaFiles", mediaList);

            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(manifest);
        } catch (Exception e) {
            log.warn("Failed to build manifest JSON", e);
            return "{}";
        }
    }

    private String getExtension(String mimeType) {
        if (mimeType == null) return "bin";
        return switch (mimeType) {
            case "image/png"     -> "png";
            case "image/jpeg"    -> "jpg";
            case "image/gif"     -> "gif";
            case "image/webp"    -> "webp";
            case "image/svg+xml" -> "svg";
            case "audio/mpeg"    -> "mp3";
            case "audio/wav"     -> "wav";
            default              -> "bin";
        };
    }
}
