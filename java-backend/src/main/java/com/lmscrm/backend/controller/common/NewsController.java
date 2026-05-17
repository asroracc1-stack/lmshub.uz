package com.lmscrm.backend.controller.common;

import com.lmscrm.backend.domain.entity.News;
import com.lmscrm.backend.repository.NewsRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/news")
@RequiredArgsConstructor
@Tag(name = "News Controller", description = "Endpoints for managing and viewing system announcements")
public class NewsController {

    private final NewsRepository newsRepository;

    @GetMapping
    @Operation(summary = "Get All News")
    public ResponseEntity<List<News>> getAll() {
        return ResponseEntity.ok(newsRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Create News")
    public ResponseEntity<News> create(@RequestBody News news) {
        return ResponseEntity.ok(newsRepository.save(news));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<News> update(@PathVariable UUID id, @RequestBody News details) {
        News news = newsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("News not found"));
        news.setTitle(details.getTitle());
        news.setContent(details.getContent());
        news.setImageUrl(details.getImageUrl());
        news.setCategory(details.getCategory());
        return ResponseEntity.ok(newsRepository.save(news));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        newsRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
