package com.lmscrm.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web configuration for Spring MVC.
 * Global CORS is handled by Spring Security in SecurityConfig.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    // MVC configuration (CORS is handled globally in SecurityConfig)
}
