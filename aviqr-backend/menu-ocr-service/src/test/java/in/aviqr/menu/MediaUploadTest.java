package in.aviqr.menu;

import in.aviqr.menu.media.MediaController;
import in.aviqr.menu.media.S3Service;
import in.aviqr.menu.media.UploadType;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MediaUploadTest {

    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10, 'J', 'F', 'I', 'F'};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0, 0, 0x0D};
    private static final byte[] SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>".getBytes(StandardCharsets.UTF_8);
    private static final byte[] HTML = "<!doctype html><script>alert(1)</script>".getBytes(StandardCharsets.UTF_8);
    private static final byte[] MP4 = {0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm', 0, 0, 0, 0};
    private static final byte[] GLB = {'g', 'l', 'T', 'F', 2, 0, 0, 0};

    // ── Detection ───────────────────────────────────────────────────────────

    @Test void detectsAllowedImageTypes() {
        assertThat(UploadType.detect(JPEG, "image")).contains(UploadType.JPEG);
        assertThat(UploadType.detect(PNG, "image")).contains(UploadType.PNG);
        assertThat(UploadType.detect("GIF89a....".getBytes(StandardCharsets.US_ASCII), "image")).contains(UploadType.GIF);
        assertThat(UploadType.detect("RIFF\0\0\0\0WEBPVP8 ".getBytes(StandardCharsets.US_ASCII), "image")).contains(UploadType.WEBP);
    }

    @Test void rejectsSvgAndHtml() {
        assertThat(UploadType.detect(SVG, "image")).isEmpty();
        assertThat(UploadType.detect(HTML, "image")).isEmpty();
        assertThat(UploadType.detect(SVG, "panorama")).isEmpty();
    }

    @Test void typeMustMatchKind() {
        assertThat(UploadType.detect(MP4, "video")).contains(UploadType.MP4);
        assertThat(UploadType.detect(MP4, "image")).isEmpty();
        assertThat(UploadType.detect(JPEG, "video")).isEmpty();
        assertThat(UploadType.detect(GLB, "model")).contains(UploadType.GLB);
        assertThat(UploadType.detect("  {\"asset\":{\"version\":\"2.0\"}}".getBytes(StandardCharsets.UTF_8), "model")).contains(UploadType.GLTF);
        assertThat(UploadType.detect(HTML, "model")).isEmpty();
    }

    @Test void tooShortIsRejected() {
        assertThat(UploadType.detect(new byte[]{(byte) 0xFF}, "image")).isEmpty();
        assertThat(UploadType.detect(null, "image")).isEmpty();
    }

    // ── Controller ──────────────────────────────────────────────────────────

    private final S3Service s3 = mock(S3Service.class);
    private final MediaController controller = new MediaController(s3);

    @Test void ownerUploadsJpegStoredAsJpegWhateverTheFilenameSays() throws Exception {
        when(s3.upload(any(), any(), any())).thenReturn("https://bucket/aviqr/menu-items/x.jpg");
        var file = new MockMultipartFile("file", "photo.html", "text/html", JPEG);
        var res = controller.upload(file, "menu-items", "image", "u1", "OWNER");
        assertThat(res.getStatusCode().value()).isEqualTo(200);
        verify(s3).upload(eq(file), eq("menu-items"), eq(UploadType.JPEG));
    }

    @Test void svgDeclaredAsImageIsRejected() throws Exception {
        var file = new MockMultipartFile("file", "logo.svg", "image/svg+xml", SVG);
        assertThat(controller.upload(file, "logos", "image", "u1", "OWNER").getStatusCode().value()).isEqualTo(400);
        verify(s3, never()).upload(any(), any(), any());
    }

    @Test void htmlRenamedToJpgIsRejected() throws Exception {
        var file = new MockMultipartFile("file", "menu.jpg", "image/jpeg", HTML);
        assertThat(controller.upload(file, "menu-items", "image", "u1", "OWNER").getStatusCode().value()).isEqualTo(400);
        verify(s3, never()).upload(any(), any(), any());
    }

    @Test void customersAndFloorStaffCannotUpload() throws Exception {
        var file = new MockMultipartFile("file", "a.jpg", "image/jpeg", JPEG);
        for (String role : new String[]{"CUSTOMER", "CASHIER", "KITCHEN", "ORDER_VIEWER", ""})
            assertThat(controller.upload(file, "misc", "image", "u1", role).getStatusCode().value()).as(role).isEqualTo(403);
        verify(s3, never()).upload(any(), any(), any());
    }

    @Test void oversizedImageIsRejected() throws Exception {
        byte[] big = Arrays.copyOf(JPEG, 5 * 1024 * 1024 + 1);
        var file = new MockMultipartFile("file", "big.jpg", "image/jpeg", big);
        assertThat(controller.upload(file, "menu-items", "image", "u1", "OWNER").getStatusCode().value()).isEqualTo(400);
        verify(s3, never()).upload(any(), any(), any());
    }

    @Test void hotelUploadsRoomTourVideo() throws Exception {
        when(s3.upload(any(), any(), any())).thenReturn("https://bucket/aviqr/room-tours/x.mp4");
        var file = new MockMultipartFile("file", "tour.mp4", "application/octet-stream", MP4);
        assertThat(controller.upload(file, "room-tours-1", "video", "h1", "HOTEL").getStatusCode().value()).isEqualTo(200);
        verify(s3).upload(any(), any(), eq(UploadType.MP4));
    }
}
