package com.lmscrm.backend.config;

import com.lmscrm.backend.domain.entity.Exam;
import com.lmscrm.backend.domain.entity.User;
import com.lmscrm.backend.dto.exam.parser.ParseResult;
import com.lmscrm.backend.repository.ExamRepository;
import com.lmscrm.backend.repository.UserRepository;
import com.lmscrm.backend.service.exam.converter.LmsHubHtmlLayoutConverter;
import com.lmscrm.backend.service.exam.parser.ExamBuilderService;
import com.lmscrm.backend.service.exam.parser.LmsHubHtmlParser;
import com.lmscrm.backend.service.exam.ExamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(100) // Runs after SuperAdminInitializer to ensure 'asrorsuperadmin' exists
public class MockTestFileImporter implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ExamRepository examRepository;
    private final LmsHubHtmlLayoutConverter layoutConverter;
    private final LmsHubHtmlParser htmlParser;
    private final ExamBuilderService examBuilderService;
    private final ExamService examService;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("📂 [MockTestFileImporter] Checking classpath*:import-mocks/*.html for programmatic automatic mock import...");

        try {
            ResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath*:import-mocks/*.html");
            if (resources.length == 0) {
                log.info("[MockTestFileImporter] No .html files found in import-mocks folder on classpath.");
                return;
            }

            // Find super admin to assign as creator
            User creator = userRepository.findByUsername("asrorsuperadmin")
                    .orElse(userRepository.findAll().stream().findFirst().orElse(null));

            if (creator == null) {
                log.warn("[MockTestFileImporter] No user found in database to assign as creator of imported exams!");
                return;
            }

            for (Resource resource : resources) {
                String fileName = resource.getFilename();
                log.info("[MockTestFileImporter] Found file to import: {}", fileName);

                try (InputStream is = resource.getInputStream()) {
                    byte[] fileBytes = is.readAllBytes();
                    String rawHtml = new String(fileBytes, StandardCharsets.UTF_8);

                    // Read title from HTML to avoid importing duplicates
                    org.jsoup.nodes.Document doc = org.jsoup.Jsoup.parse(rawHtml);
                    org.jsoup.nodes.Element htmlEl = doc.selectFirst("html");
                    String title = "";
                    if (htmlEl != null && htmlEl.hasAttr("data-title")) {
                        title = htmlEl.attr("data-title");
                    } else {
                        org.jsoup.nodes.Element metaTitle = doc.selectFirst("meta[name=lmshub:title]");
                        title = metaTitle != null ? metaTitle.attr("content") : "";
                    }
                    if (title.isEmpty()) {
                        org.jsoup.nodes.Element titleEl = doc.selectFirst("title");
                        title = titleEl != null ? titleEl.text() : "Imported Exam";
                    }

                    if (examRepository.existsByTitle(title)) {
                        log.info("[MockTestFileImporter] Exam with title '{}' already exists in database. Deleting old version before re-import...", title);
                        java.util.List<Exam> existing = examRepository.findByTitle(title);
                        for (Exam e : existing) {
                            try {
                                examService.deleteExam(e.getId());
                            } catch (Exception ex) {
                                log.warn("[MockTestFileImporter] Failed to delete existing exam ID {}: {}", e.getId(), ex.getMessage());
                            }
                        }
                    }

                    log.info("[MockTestFileImporter] Importing exam '{}'...", title);

                    // 1. Convert layout if needed
                    byte[] specBytes = fileBytes;
                    if (!rawHtml.contains("<lmshub-section")) {
                        String convertedHtml = layoutConverter.convertToLmsHubSpecification(fileBytes, fileName, "IELTS");
                        specBytes = convertedHtml.getBytes(StandardCharsets.UTF_8);
                    }

                    // 2. Parse converted spec
                    ParseResult parseResult = htmlParser.parse(specBytes, fileName);

                    // 3. Save to database
                    Exam savedExam = examBuilderService.buildAndSave(parseResult, creator);
                    log.info("[MockTestFileImporter] Programmatically successfully imported exam '{}' with ID: {}", savedExam.getTitle(), savedExam.getId());

                } catch (Exception e) {
                    log.error("[MockTestFileImporter] Failed to import file: " + fileName, e);
                }
            }

        } catch (Exception e) {
            log.error("[MockTestFileImporter] Error scanning or importing mock test resources", e);
        }
    }
}
