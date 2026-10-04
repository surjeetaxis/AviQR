package in.aviqr.pms.service;

import in.aviqr.pms.entity.GuestDocument;
import in.aviqr.pms.repository.GuestDocumentRepository;
import org.junit.jupiter.api.Test;

import java.util.Base64;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class GuestDocumentServiceTest {
    final GuestDocumentRepository repo = mock(GuestDocumentRepository.class);
    final String key = Base64.getEncoder().encodeToString(new byte[32]);
    final byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 1, 2, 3, 4, 5};

    GuestDocumentService service(String k) {
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        return new GuestDocumentService(repo, k, 30);
    }

    @Test
    void storesCiphertextAndDecryptsForTheSameReservation() {
        GuestDocumentService s = service(key);
        UUID reservation = UUID.randomUUID();
        GuestDocument doc = s.store(UUID.randomUUID(), reservation, "passport", "image/jpeg", jpeg, "staff");
        assertThat(doc.getDocType()).isEqualTo("PASSPORT");
        assertThat(doc.getContent()).isNotEqualTo(jpeg).hasSize(jpeg.length + 16);
        assertThat(s.read(doc)).isEqualTo(jpeg);
        doc.setReservationId(UUID.randomUUID()); // swapped onto another booking
        assertThatThrownBy(() -> s.read(doc)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejectsWrongTypesSizesAndMissingKey() {
        GuestDocumentService s = service(key);
        UUID id = UUID.randomUUID();
        assertThatThrownBy(() -> s.store(id, id, "OTHER", "image/gif", jpeg, "s")).hasMessageContaining("JPEG");
        assertThatThrownBy(() -> s.store(id, id, "OTHER", "image/png", jpeg, "s")).hasMessageContaining("doesn't match");
        assertThatThrownBy(() -> s.store(id, id, "OTHER", "image/jpeg", new byte[GuestDocumentService.MAX_BYTES + 1], "s")).hasMessageContaining("5 MB");
        assertThatThrownBy(() -> s.store(id, id, "SELFIE", "image/jpeg", jpeg, "s")).hasMessageContaining("document type");
        GuestDocumentService off = service("");
        assertThat(off.enabled()).isFalse();
        assertThatThrownBy(() -> off.store(id, id, "OTHER", "image/jpeg", jpeg, "s")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new GuestDocumentService(repo, Base64.getEncoder().encodeToString(new byte[16]), 30))
            .hasMessageContaining("32 bytes");
    }
}
