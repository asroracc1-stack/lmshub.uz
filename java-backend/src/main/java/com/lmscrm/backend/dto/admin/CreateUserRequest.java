package com.lmscrm.backend.dto.admin;

import lombok.Data;

import java.util.UUID;

/**
 * DTO used by AdminUserController to receive user creation / update requests.
 * Using a dedicated DTO avoids accidentally deserialising into the Spring Security
 * UserDetails entity and prevents mass-assignment security issues.
 */
@Data
public class CreateUserRequest {
    private String username;
    private String password;
    @com.fasterxml.jackson.annotation.JsonProperty("full_name")
    private String full_name;     // frontend sends snake_case
    private String fullName;      // also accept camelCase
    private String email;
    @com.fasterxml.jackson.annotation.JsonProperty("phone_number")
    private String phone_number;
    private String phoneNumber;
    private String role;          // TEACHER | STUDENT | ADMINISTRATOR | PARENT | ADMIN
    private String phoneOrUsername; // For frontend compatibility in Parents.tsx
    private String subject;
    private java.util.UUID organizationId;
    @com.fasterxml.jackson.annotation.JsonProperty("organization_id")
    private java.util.UUID organization_id; // frontend sends snake_case
    @com.fasterxml.jackson.annotation.JsonProperty("parent_telegram_username")
    private String parent_telegram_username;
    private java.util.UUID groupId;
    @com.fasterxml.jackson.annotation.JsonProperty("group_id")
    private java.util.UUID group_id;
    @com.fasterxml.jackson.annotation.JsonProperty("card_number")
    private String card_number;
    private String cardNumber;
    @com.fasterxml.jackson.annotation.JsonProperty("card_holder")
    private String card_holder;
    private String cardHolder;
}

