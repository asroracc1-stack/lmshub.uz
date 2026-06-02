package com.lmscrm.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping({"/", "/health", "/healthz"})
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("UP");
    }
}
