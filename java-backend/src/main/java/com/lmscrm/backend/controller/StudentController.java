package com.lmscrm.backend.controller;

import com.lmscrm.backend.dto.StudentSearchResponse;
import com.lmscrm.backend.service.StudentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/students")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;

    @GetMapping("/search")
    public ResponseEntity<List<StudentSearchResponse>> searchStudents(@RequestParam(required = false) String query) {
        List<StudentSearchResponse> students = studentService.searchStudents(query);
        return ResponseEntity.ok(students);
    }
}
