package in.aviqr.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableDiscoveryClient
@EnableScheduling
public class AuthServiceApplication {
    public static void main(String[] args) throws Exception {
        if("true".equalsIgnoreCase(System.getenv("AVIQR_MIGRATE_ONLY"))){
            try(var connection=java.sql.DriverManager.getConnection(required("DB_URL"),required("DB_USERNAME"),required("DB_PASSWORD"))){
                var database=liquibase.database.DatabaseFactory.getInstance().findCorrectDatabaseImplementation(new liquibase.database.jvm.JdbcConnection(connection));
                try(var migrations=new liquibase.Liquibase("db/changelog/db.changelog-master.xml",new liquibase.resource.ClassLoaderResourceAccessor(),database)){
                    migrations.update(new liquibase.Contexts(),new liquibase.LabelExpression());
                }
            }
            return;
        }
        SpringApplication.run(AuthServiceApplication.class, args);
    }
    private static String required(String name){String value=System.getenv(name);if(value==null || value.isBlank())throw new IllegalStateException("Migration mode requires "+name);return value;}
}
