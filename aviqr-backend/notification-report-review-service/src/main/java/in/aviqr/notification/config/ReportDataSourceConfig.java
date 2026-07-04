package in.aviqr.notification.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

// Two Postgres databases live behind this one app: the primary spring.datasource is
// JPA's, for the Review entity (merged from review-service, its own aviqr_review DB).
// Reports (merged from report-service) read the separate aviqr_order DB read-only via
// plain JdbcTemplate against this second, explicitly-defined DataSource. Both DataSource
// beans must be declared here — defining just the second one would make Spring Boot's
// own spring.datasource autoconfiguration back off (it only activates when no DataSource
// bean exists yet), so the primary one is declared explicitly too, marked @Primary so
// JPA's autoconfiguration wires to it instead of this one.
//
// Binding goes through DataSourceProperties (not a raw @ConfigurationProperties DataSource)
// because that's the class that knows how to turn "url" into Hikari's "jdbcUrl" — binding
// @ConfigurationProperties straight onto a built HikariDataSource leaves jdbcUrl unset.
@Configuration
public class ReportDataSourceConfig {

    @Bean
    @ConfigurationProperties("spring.datasource")
    public DataSourceProperties reviewDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Primary
    @Bean
    public DataSource reviewDataSource(DataSourceProperties reviewDataSourceProperties) {
        return reviewDataSourceProperties.initializeDataSourceBuilder().build();
    }

    @Bean
    @ConfigurationProperties("report.datasource")
    public DataSourceProperties reportDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    public DataSource reportDataSource(DataSourceProperties reportDataSourceProperties) {
        return reportDataSourceProperties.initializeDataSourceBuilder().build();
    }

    @Bean
    public JdbcTemplate reportJdbcTemplate(@Qualifier("reportDataSource") DataSource reportDataSource) {
        return new JdbcTemplate(reportDataSource);
    }
}
