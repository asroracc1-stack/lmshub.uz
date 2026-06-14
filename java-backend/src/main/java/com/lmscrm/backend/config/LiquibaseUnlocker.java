package com.lmscrm.backend.config;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.stereotype.Component;
import liquibase.integration.spring.SpringLiquibase;
import lombok.extern.slf4j.Slf4j;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

@Component
@Slf4j
public class LiquibaseUnlocker implements BeanPostProcessor {

    private final DataSource dataSource;

    public LiquibaseUnlocker(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
        if (bean instanceof SpringLiquibase) {
            log.info("🔓 Auto-releasing Liquibase locks before SpringLiquibase initializes...");
            try (Connection connection = dataSource.getConnection();
                 Statement statement = connection.createStatement()) {
                statement.executeUpdate("UPDATE databasechangeloglock SET locked = false, lockgranted = null, lockedby = null");
                log.info("🔓 Liquibase lock successfully released!");
            } catch (Exception e) {
                log.warn("🔓 Could not auto-release Liquibase lock (this is normal if table doesn't exist yet): {}", e.getMessage());
            }
        }
        return bean;
    }
}
