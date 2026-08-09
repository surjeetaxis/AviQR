package in.aviqr.menu.media;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.UUID;

// Uploads menu item photos / shop logos to S3. Credentials come from the AWS SDK's
// default credential chain (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars, or an
// instance role in production) — never read from a Spring property, so no secret ever
// needs to sit in a properties/YAML file.
@Service @Slf4j
public class S3Service {

    @Value("${aws.s3.bucket}") private String bucket;
    @Value("${aws.s3.region}") private String regionName;

    // All AviQR uploads live under this prefix — the bucket is shared with other apps.
    private static final String KEY_PREFIX = "aviqr";

    public String upload(MultipartFile file, String folder) throws Exception {
        String key = "%s/%s/%s%s".formatted(KEY_PREFIX, sanitizeFolder(folder), UUID.randomUUID(), extensionOf(file));
        try (S3Client s3 = S3Client.builder()
                .region(Region.of(regionName))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build()) {
            s3.putObject(
                PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(file.getContentType())
                    .build(),
                RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        }
        String url = "https://%s.s3.%s.amazonaws.com/%s".formatted(bucket, regionName, key);
        log.info("Uploaded {} ({} bytes) to {}", file.getOriginalFilename(), file.getSize(), url);
        return url;
    }

    private String sanitizeFolder(String folder) {
        String f = folder == null ? "" : folder.replaceAll("[^a-zA-Z0-9_-]", "");
        return f.isBlank() ? "misc" : f;
    }

    private String extensionOf(MultipartFile file) {
        String name = file.getOriginalFilename();
        if (name != null && name.contains(".")) return name.substring(name.lastIndexOf('.')).toLowerCase();
        return switch (String.valueOf(file.getContentType())) {
            case "image/png"  -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif"  -> ".gif";
            default -> ".jpg";
        };
    }
}
