package in.aviqr.auth;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import java.sql.*;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
@EnabledIfSystemProperty(named="aviqr.security.test-db",matches=".+")
class SecurityMigrationTest {
 @Test void migrationIsRepeatableAndAuditHistoryIsAppendOnly()throws Exception{
  String base=System.getProperty("aviqr.security.test-db"),name="aviqr_migration_"+UUID.randomUUID().toString().replace("-","");
  int slash=base.lastIndexOf('/');String url=base.substring(0,slash+1)+name;
  try(var admin=DriverManager.getConnection(base,"security_test","");var adminSql=admin.createStatement()){
   adminSql.execute("CREATE DATABASE "+name);
   try(var connection=DriverManager.getConnection(url,"security_test","");var sql=connection.createStatement()){
    sql.execute("CREATE TABLE users(id UUID PRIMARY KEY,status VARCHAR(255)); CREATE TABLE refresh_tokens(id UUID PRIMARY KEY); CREATE TABLE otp_records(id UUID PRIMARY KEY,type VARCHAR(255));");
    var database=liquibase.database.DatabaseFactory.getInstance().findCorrectDatabaseImplementation(new liquibase.database.jvm.JdbcConnection(connection));
    var migrations=new liquibase.Liquibase("db/changelog/db.changelog-master.xml",new liquibase.resource.ClassLoaderResourceAccessor(),database);
    migrations.update(new liquibase.Contexts(),new liquibase.LabelExpression());migrations.update(new liquibase.Contexts(),new liquibase.LabelExpression());
    connection.setAutoCommit(true);
    sql.execute("INSERT INTO otp_records(id,type) VALUES(gen_random_uuid(),'STEP_UP')");
    String event=UUID.randomUUID().toString(),grant=UUID.randomUUID().toString();
    sql.execute("INSERT INTO login_security_records(id,email,kind,status,created_at) VALUES('"+event+"','test@example.com','LOGIN_FAILURE','FAILED',now()),('"+grant+"','test@example.com','STEP_UP_GRANT','ACTIVE',now())");
    assertThatThrownBy(()->sql.execute("DELETE FROM login_security_records WHERE id='"+event+"'")).isInstanceOf(SQLException.class).hasMessageContaining("append-only");
    assertThatThrownBy(()->sql.execute("UPDATE login_security_records SET reason='hidden' WHERE id='"+event+"'")).isInstanceOf(SQLException.class).hasMessageContaining("cannot be altered");
    assertThat(sql.executeUpdate("UPDATE login_security_records SET status='USED' WHERE id='"+grant+"'")).isEqualTo(1);
    assertThatThrownBy(()->sql.execute("UPDATE login_security_records SET status='ACTIVE' WHERE id='"+grant+"'")).isInstanceOf(SQLException.class);
    String role="aviqr_runtime_"+UUID.randomUUID().toString().replace("-","");
    sql.execute("CREATE ROLE "+role+" NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION; GRANT USAGE ON SCHEMA public TO "+role+"; GRANT SELECT,INSERT ON login_security_records TO "+role+"; GRANT UPDATE(status) ON login_security_records TO "+role);
    try{
     sql.execute("SET ROLE "+role);
     assertThatThrownBy(()->sql.execute("ALTER TABLE login_security_records DISABLE TRIGGER immutable_security_history")).isInstanceOf(SQLException.class);
     assertThatThrownBy(()->sql.execute("UPDATE login_security_records SET reason='hidden' WHERE id='"+event+"'")).isInstanceOf(SQLException.class);
     assertThatThrownBy(()->sql.execute("DELETE FROM login_security_records WHERE id='"+event+"'")).isInstanceOf(SQLException.class);
    }finally{sql.execute("RESET ROLE; DROP OWNED BY "+role+"; DROP ROLE "+role);}
   }finally{adminSql.execute("DROP DATABASE "+name+" WITH (FORCE)");}
  }
 }
}
