package in.aviqr.security;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.InitializingBean;
import javax.sql.DataSource;
/** Runtime connections must not own application tables or have PostgreSQL administrative powers. */
@Configuration
public class DatabasePrivilegeConfiguration {
 @Bean InitializingBean verifyRuntimeDatabasePrivileges(Environment env,ObjectProvider<DataSource> sources){return ()->{
  boolean required=env.getProperty("DATABASE_LEAST_PRIVILEGE_REQUIRED",Boolean.class,env.acceptsProfiles(org.springframework.core.env.Profiles.of("production")));
  if(!required)return;var source=sources.getIfAvailable();if(source==null)return;
  try(var connection=source.getConnection();var statement=connection.createStatement()){
   try(var result=statement.executeQuery("SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication FROM pg_roles WHERE rolname=current_user")){
    if(!result.next() || result.getBoolean(1))throw new IllegalStateException("Runtime PostgreSQL role must not have administrative privileges");
   }
   try(var result=statement.executeQuery("SELECT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tableowner=current_user) OR has_schema_privilege(current_user,'public','CREATE')")){
    if(!result.next() || result.getBoolean(1))throw new IllegalStateException("Runtime PostgreSQL role must not own tables or create objects; use a separate migration role");
   }
  }
 };}
}
