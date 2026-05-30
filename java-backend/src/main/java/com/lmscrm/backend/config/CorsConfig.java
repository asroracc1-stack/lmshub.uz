package com.lmscrm.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins(
                                "http://localhost:5173", // Frontend development server
                                "http://localhost:3000",
                                "https://lmshubuz.vercel.app" // Another common frontend development server
                                "https://lmshub.uz",     // Production domain
                                "https://*.lmshub.uz",   // Subdomains for production
                                "https://lmshub-uz.up.railway.app" // Railway dynamic domain example
                        )
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true)
                        .maxAge(3600); // 1 hour
            }
        };
    }
}
