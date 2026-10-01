package in.aviqr.pms.service;

import in.aviqr.pms.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

/** Sync Logs page query: every filter optional, newest first, paged. */
@Component @RequiredArgsConstructor
public class ChannelSyncLogSearch {

    public static final int MAX_PAGE_SIZE = 200;

    private final MongoTemplate mongo;

    public record Filter(ChannelName channel, SyncType type, SyncStatus status, SyncDirection direction,
                         UUID roomTypeId, LocalDate from, LocalDate to, String text) {}

    public record Result(List<ChannelSyncLog> items, long total) {}

    public Result search(UUID hotelId, Filter f, int page, int size) {
        List<Criteria> and = new ArrayList<>();
        and.add(Criteria.where("hotelId").is(hotelId));
        if (f.channel() != null) and.add(Criteria.where("channel").is(f.channel()));
        if (f.type() != null) and.add(Criteria.where("syncType").is(f.type()));
        if (f.status() != null) and.add(Criteria.where("status").is(f.status()));
        if (f.direction() != null) and.add(Criteria.where("direction").is(f.direction()));
        // roomTypeIds is a comma-separated list; UUIDs can't collide as substrings.
        if (f.roomTypeId() != null) and.add(Criteria.where("roomTypeIds").regex(Pattern.quote(f.roomTypeId().toString())));
        if (f.from() != null || f.to() != null) {
            Criteria when = Criteria.where("createdAt");
            if (f.from() != null) when = when.gte(f.from().atStartOfDay());
            if (f.to() != null) when = when.lt(f.to().plusDays(1).atStartOfDay());
            and.add(when);
        }
        if (f.text() != null && !f.text().isBlank())
            and.add(Criteria.where("message").regex(Pattern.quote(f.text().trim()), "i"));

        Query query = new Query(new Criteria().andOperator(and.toArray(new Criteria[0])));
        long total = mongo.count(query, ChannelSyncLog.class);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        query.with(Sort.by(Sort.Direction.DESC, "createdAt")).skip((long) Math.max(page, 0) * safeSize).limit(safeSize);
        return new Result(mongo.find(query, ChannelSyncLog.class), total);
    }
}
