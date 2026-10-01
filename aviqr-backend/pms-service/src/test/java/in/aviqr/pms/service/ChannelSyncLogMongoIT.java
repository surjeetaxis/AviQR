package in.aviqr.pms.service;

import com.mongodb.MongoClientSettings;
import com.mongodb.ConnectionString;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import in.aviqr.pms.entity.*;
import org.bson.Document;
import org.bson.UuidRepresentation;
import org.junit.jupiter.api.*;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.*;

/**
 * Runs against a local MongoDB (and, for the migration test, the local aviqr_pms
 * Postgres) when they're reachable; skipped otherwise (e.g. in CI). Uses a throwaway
 * Mongo database and only rows it inserts itself.
 */
class ChannelSyncLogMongoIT {

    private static MongoClient client;
    private static MongoTemplate mongo;
    private static final String DB = "aviqr_logs_it_" + System.currentTimeMillis();

    @BeforeAll
    static void connect() {
        try {
            client = MongoClients.create(MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString("mongodb://localhost:27017"))
                .uuidRepresentation(UuidRepresentation.STANDARD)
                .applyToClusterSettings(b -> b.serverSelectionTimeout(1500, TimeUnit.MILLISECONDS))
                .build());
            client.getDatabase("admin").runCommand(new Document("ping", 1));
            mongo = new MongoTemplate(client, DB);
        } catch (Exception e) {
            client = null;
        }
        Assumptions.assumeTrue(client != null, "local MongoDB not reachable");
    }

    @AfterAll
    static void cleanup() {
        if (client != null) { client.getDatabase(DB).drop(); client.close(); }
    }

    private ChannelSyncLog row(UUID hotel, SyncType type, SyncStatus status, String rooms, String msg, LocalDateTime at) {
        return ChannelSyncLog.builder().hotelId(hotel).channel(ChannelName.AXISROOMS).direction(SyncDirection.PUSH)
            .syncType(type).status(status).roomTypeIds(rooms).message(msg).createdAt(at).build();
    }

    @Test
    @DisplayName("search filters, pages newest-first and counts the full match")
    void searchAndPaging() {
        UUID hotel = UUID.randomUUID(), other = UUID.randomUUID(), rt = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now().withNano(0);
        for (int i = 0; i < 7; i++)
            mongo.save(row(hotel, SyncType.INVENTORY, SyncStatus.SUCCESS, rt + "," + UUID.randomUUID(), "Pushed inventory " + i, now.minusMinutes(i)));
        mongo.save(row(hotel, SyncType.RATES, SyncStatus.FAILED, rt.toString(), "Rejected prices — Ratecode[ap] not mapped", now.minusDays(3)));
        mongo.save(row(hotel, SyncType.RESTRICTIONS, SyncStatus.SKIPPED, UUID.randomUUID().toString(), "Skipped stop-sell", now));
        mongo.save(row(other, SyncType.INVENTORY, SyncStatus.SUCCESS, rt.toString(), "other hotel", now));
        ChannelSyncLogSearch search = new ChannelSyncLogSearch(mongo);
        var none = new ChannelSyncLogSearch.Filter(null, null, null, null, null, null, null, null);

        var page0 = search.search(hotel, none, 0, 4);
        assertThat(page0.total()).isEqualTo(9);
        assertThat(page0.items()).hasSize(4);
        assertThat(page0.items()).isSortedAccordingTo((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        assertThat(search.search(hotel, none, 2, 4).items()).hasSize(1);   // 9 rows, 4 per page

        assertThat(search.search(hotel, new ChannelSyncLogSearch.Filter(null, SyncType.INVENTORY, null, null, null, null, null, null), 0, 50).total()).isEqualTo(7);
        assertThat(search.search(hotel, new ChannelSyncLogSearch.Filter(null, null, SyncStatus.FAILED, null, null, null, null, null), 0, 50).total()).isEqualTo(1);
        assertThat(search.search(hotel, new ChannelSyncLogSearch.Filter(null, null, null, null, rt, null, null, null), 0, 50).total()).isEqualTo(8);
        assertThat(search.search(hotel, new ChannelSyncLogSearch.Filter(null, null, null, null, null, null, null, "ratecode[AP]"), 0, 50).total()).isEqualTo(1);
        LocalDate today = LocalDate.now();
        assertThat(search.search(hotel, new ChannelSyncLogSearch.Filter(null, null, null, null, null, today.minusDays(3), today.minusDays(3), null), 0, 50).total()).isEqualTo(1);
    }

    @Test
    @DisplayName("indexes include a TTL on createdAt with the configured lifetime")
    void ttlIndex() {
        ChannelSyncLogMongoSetup setup = new ChannelSyncLogMongoSetup(mongo, null);
        ReflectionTestUtils.setField(setup, "ttlDays", 30);
        setup.ensureIndexes();
        var ttl = mongo.indexOps(ChannelSyncLog.class).getIndexInfo().stream()
            .filter(i -> i.getName().equals("ttl_createdAt")).findFirst();
        assertThat(ttl).isPresent();
        assertThat(ttl.get().getExpireAfter()).hasValueSatisfying(d -> assertThat(d.toDays()).isEqualTo(30));
    }

    @Test
    @DisplayName("old Postgres rows are copied once, with their ids and new columns")
    void migrationFromPostgres() {
        DriverManagerDataSource ds = new DriverManagerDataSource("jdbc:postgresql://localhost:5432/aviqr_pms", "aviqr", "aviqr_secret");
        JdbcTemplate jdbc = new JdbcTemplate(ds);
        try { jdbc.queryForObject("select 1", Integer.class); }
        catch (Exception e) { Assumptions.abort("local Postgres aviqr_pms not reachable"); }

        UUID hotel = UUID.randomUUID(), id = UUID.randomUUID();
        jdbc.update("insert into pms_channel_sync_logs (id, hotel_id, channel, direction, status, message, request_body, sync_type, room_type_ids, created_at) "
            + "values (?::uuid, ?::uuid, 'AXISROOMS', 'PUSH', 'FAILED', 'migrated row', '{\"a\":1}', 'RATES', 'rt-1', now())",
            id.toString(), hotel.toString());
        try {
            ChannelSyncLogMongoSetup setup = new ChannelSyncLogMongoSetup(mongo, jdbc);
            setup.migrateFromPostgres();
            ChannelSyncLog copied = mongo.findById(id, ChannelSyncLog.class);
            assertThat(copied).isNotNull();
            assertThat(copied.getHotelId()).isEqualTo(hotel);
            assertThat(copied.getStatus()).isEqualTo(SyncStatus.FAILED);
            assertThat(copied.getSyncType()).isEqualTo(SyncType.RATES);
            assertThat(copied.getRequestBody()).isEqualTo("{\"a\":1}");

            // Marker written: a second run must not copy again.
            mongo.remove(copied);
            setup.migrateFromPostgres();
            assertThat(mongo.findById(id, ChannelSyncLog.class)).isNull();
        } finally {
            jdbc.update("delete from pms_channel_sync_logs where id = ?::uuid", id.toString());
        }
    }
}
