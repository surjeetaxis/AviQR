package in.aviqr.support.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

// support-service's own DB (tickets, impersonation logs) stays the JPA-managed
// primary datasource, declared explicitly and marked @Primary — same reason as
// notification-report-review-service's ReportDataSourceConfig: declaring only
// the extra DataSource beans below would make Spring Boot's own spring.datasource
// autoconfiguration back off. Two more read-only DataSource/JdbcTemplate pairs give
// the analytics module cross-service visibility into auth-service's users/sessions
// and order-qr-service's orders/revenue — this codebase has no service-to-service
// data API for reporting, only direct read-only DB access, so this follows the
// exact convention ReportController already established.
@Configuration
public class AnalyticsDataSourceConfig {

    @Bean
    @ConfigurationProperties("spring.datasource")
    public DataSourceProperties supportDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Primary
    @Bean
    public DataSource supportDataSource(DataSourceProperties supportDataSourceProperties) {
        return supportDataSourceProperties.initializeDataSourceBuilder().build();
    }

    @Bean
    @ConfigurationProperties("analytics.auth-datasource")
    public DataSourceProperties authAnalyticsDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    public DataSource authAnalyticsDataSource(
            @Qualifier("authAnalyticsDataSourceProperties") DataSourceProperties props) {
        return props.initializeDataSourceBuilder().build();
    }

    @Bean
    public JdbcTemplate authAnalyticsJdbcTemplate(@Qualifier("authAnalyticsDataSource") DataSource ds) {
        return new JdbcTemplate(ds);
    }

    @Bean
    @ConfigurationProperties("analytics.order-datasource")
    public DataSourceProperties orderAnalyticsDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    public DataSource orderAnalyticsDataSource(
            @Qualifier("orderAnalyticsDataSourceProperties") DataSourceProperties props) {
        return props.initializeDataSourceBuilder().build();
    }

    @Bean
    public JdbcTemplate orderAnalyticsJdbcTemplate(@Qualifier("orderAnalyticsDataSource") DataSource ds) {
        return new JdbcTemplate(ds);
    }
}
