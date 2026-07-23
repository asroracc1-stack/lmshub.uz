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

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("📂 [MockTestFileImporter] Checking classpath*:import-mocks/*.html for programmatic automatic mock import...");

        fixDatabaseQuestions();

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

    private void fixDatabaseQuestions() {
        try {
            entityManager.createNativeQuery(
                "UPDATE questions SET question_type = 'YES_NO_NG' WHERE UPPER(correct_answer) IN ('YES', 'NO', 'NOT GIVEN') AND (question_type IS NULL OR LOWER(question_type) LIKE '%short%' OR LOWER(question_type) LIKE '%fill%')"
            ).executeUpdate();

            entityManager.createNativeQuery(
                "UPDATE questions SET question_type = 'TRUE_FALSE_NG' WHERE UPPER(correct_answer) IN ('TRUE', 'FALSE') AND (question_type IS NULL OR LOWER(question_type) LIKE '%short%' OR LOWER(question_type) LIKE '%fill%')"
            ).executeUpdate();

            entityManager.createNativeQuery(
                "INSERT INTO question_options (id, question_id, text, is_correct, position_order) " +
                "SELECT gen_random_uuid(), q.id, opt.text, false, opt.pos " +
                "FROM questions q " +
                "CROSS JOIN (VALUES ('YES', 1), ('NO', 2), ('NOT GIVEN', 3)) AS opt(text, pos) " +
                "WHERE (UPPER(q.question_type) = 'YES_NO_NG' OR UPPER(q.question_type) = 'YES_NO_NOT_GIVEN') " +
                "AND NOT EXISTS (SELECT 1 FROM question_options qo WHERE qo.question_id = q.id)"
            ).executeUpdate();

            entityManager.createNativeQuery(
                "INSERT INTO question_options (id, question_id, text, is_correct, position_order) " +
                "SELECT gen_random_uuid(), q.id, opt.text, false, opt.pos " +
                "FROM questions q " +
                "CROSS JOIN (VALUES ('TRUE', 1), ('FALSE', 2), ('NOT GIVEN', 3)) AS opt(text, pos) " +
                "WHERE (UPPER(q.question_type) = 'TRUE_FALSE_NG' OR UPPER(q.question_type) = 'TRUE_FALSE_NOT_GIVEN') " +
                "AND NOT EXISTS (SELECT 1 FROM question_options qo WHERE qo.question_id = q.id)"
            ).executeUpdate();

            log.info("✅ [MockTestFileImporter] Auto-healed existing DB question types and options for YNNG/TFNG!");
        } catch (Exception e) {
            log.warn("[MockTestFileImporter] Auto-heal query skipped or deferred: {}", e.getMessage());
        }
    }
}
