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
                // Read allowed origins from environment variable (comma‑separated list)
                String originsEnv = System.getenv("ALLOWED_ORIGINS");
                String[] allowedOrigins;
                if (originsEnv != null && !originsEnv.isBlank()) {
                    allowedOrigins = originsEnv.split(",");
                } else {
                    // Fallback to safe defaults including production
                    allowedOrigins = new String[]{"http://localhost:5173", "http://localhost:3000", "https://lmshub.uz", "https://www.lmshub.uz", "https://lmshub-uz.vercel.app"};
                }
                registry.addMapping("/**")
                        .allowedOriginPatterns(allowedOrigins)
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true)
                        .maxAge(3600);
            }
        };
    }
}