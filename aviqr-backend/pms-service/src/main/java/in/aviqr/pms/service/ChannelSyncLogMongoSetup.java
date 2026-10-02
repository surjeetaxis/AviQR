package in.aviqr.pms.service;

import in.aviqr.pms.entity.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.util.*;

/**
 * On startup: makes sure the MongoDB sync-log collection has its indexes (per-hotel
 * newest-first, plus a TTL that expires rows after channel.sync-log.ttl-days), then
 * — once — copies rows from the Postgres pms_channel_sync_logs table that logs used
 * to be written to. The copy runs in the background so it never delays startup, is
 * idempotent (same ids, upserted) and records a marker so it runs only once.
 */
@Component @RequiredArgsConstructor @Slf4j
public class ChannelSyncLogMongoSetup implements ApplicationRunner {

    static final String MIGRATION_MARKER_COLLECTION = "pms_migrations";
    static final String MIGRATION_ID = "channel-sync-logs-from-postgres";
    private static final int BATCH = 500;

    private final MongoTemplate mongo;
    private final JdbcTemplate jdbc;

    @Value("${channel.sync-log.ttl-days:180}") private int ttlDays;
    @Value("${channel.sync-log.migrate-from-postgres:true}") private boolean migrate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            ensureIndexes();
        } catch (Exception e) {
            log.warn("Could not create channel sync-log indexes in MongoDB: {}", e.getMessage());
        }
        if (migrate) {
            Thread t = new Thread(this::migrateFromPostgres, "sync-log-migration");
            t.setDaemon(true);
            t.start();
        }
    }

    void ensureIndexes() {
        IndexOperations ops = mongo.indexOps(ChannelSyncLog.class);
        ops.createIndex(new Index().on("hotelId", Sort.Direction.ASC).on("createdAt", Sort.Direction.DESC)
            .named("hotel_createdAt"));
        ops.createIndex(new Index().on("hotelId", Sort.Direction.ASC).on("direction", Sort.Direction.ASC)
            .on("createdAt", Sort.Direction.DESC).named("hotel_direction_createdAt"));
        ops.createIndex(new Index().on("createdAt", Sort.Direction.ASC)
            .expire(Duration.ofDays(Math.max(ttlDays, 1))).named("ttl_createdAt"));
    }

    void migrateFromPostgres() {
        try {
            if (mongo.exists(org.springframework.data.mongodb.core.query.Query.query(
                    org.springframework.data.mongodb.core.query.Criteria.where("_id").is(MIGRATION_ID)), MIGRATION_MARKER_COLLECTION))
                return;
            Boolean tableExists = jdbc.queryForObject("select to_regclass('pms_channel_sync_logs') is not null", Boolean.class);
            if (!Boolean.TRUE.equals(tableExists)) {
                markDone(0);
                return;
            }
            long copied = 0;
            for (int offset = 0; ; offset += BATCH) {
                List<ChannelSyncLog> rows = jdbc.query(
                    "select * from pms_channel_sync_logs order by created_at, id limit ? offset ?",
                    (rs, i) -> fromRow(rs), BATCH, offset);
                if (rows.isEmpty()) break;
                rows.forEach(mongo::save);
                copied += rows.size();
                if (rows.size() < BATCH) break;
            }
            markDone(copied);
            log.info("Copied {} channel sync log row(s) from Postgres to MongoDB", copied);
        } catch (Exception e) {
            // Not fatal: new logs already go to MongoDB; the copy retries next startup.
            log.warn("Channel sync-log copy from Postgres to MongoDB failed (will retry on next start): {}", e.getMessage());
        }
    }

    private void markDone(long copied) {
        mongo.save(new Document("_id", MIGRATION_ID).append("copied", copied).append("at", new Date()), MIGRATION_MARKER_COLLECTION);
    }

    /** Older databases lack some columns (they were added over time), so each is read only if present. */
    static ChannelSyncLog fromRow(ResultSet rs) throws SQLException {
        Set<String> cols = new HashSet<>();
        ResultSetMetaData md = rs.getMetaData();
        for (int i = 1; i <= md.getColumnCount(); i++) cols.add(md.getColumnLabel(i).toLowerCase());
        ChannelSyncLog l = new ChannelSyncLog();
        l.setId(UUID.fromString(rs.getString("id")));
        l.setHotelId(UUID.fromString(rs.getString("hotel_id")));
        l.setChannel(ChannelName.valueOf(rs.getString("channel")));
        l.setDirection(SyncDirection.valueOf(rs.getString("direction")));
        l.setStatus(SyncStatus.valueOf(rs.getString("status")));
        l.setMessage(rs.getString("message"));
        Timestamp created = rs.getTimestamp("created_at");
        l.setCreatedAt(created != null ? created.toLocalDateTime() : null);
        if (cols.contains("request_body")) l.setRequestBody(rs.getString("request_body"));
        if (cols.contains("response_body")) l.setResponseBody(rs.getString("response_body"));
        if (cols.contains("sync_type") && rs.getString("sync_type") != null) l.setSyncType(SyncType.valueOf(rs.getString("sync_type")));
        if (cols.contains("external_property_id")) l.setExternalPropertyId(rs.getString("external_property_id"));
        if (cols.contains("room_type_ids")) l.setRoomTypeIds(rs.getString("room_type_ids"));
        if (cols.contains("date_from") && rs.getDate("date_from") != null) l.setDateFrom(rs.getDate("date_from").toLocalDate());
        if (cols.contains("date_to") && rs.getDate("date_to") != null) l.setDateTo(rs.getDate("date_to").toLocalDate());
        if (cols.contains("trigger_source")) l.setTriggerSource(rs.getString("trigger_source"));
        if (cols.contains("triggered_by")) l.setTriggeredBy(rs.getString("triggered_by"));
        return l;
    }
}
