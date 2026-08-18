package in.aviqr.support.controller;

import in.aviqr.support.dto.*;
import in.aviqr.support.entity.*;
import in.aviqr.support.repository.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

// Internal sales-lead CRM for AviQR's own staff to work prospective restaurant/
// hotel/mall owners — not to be confused with a shop's own Customer/CRM (that's
// shop-mall-service's Customer entity, a different domain). Every write here is
// gated to ADMIN/SUPPORT, same as SupportController.
@RestController @RequiredArgsConstructor
public class LeadController {
    private final LeadRepository leadRepo;
    private final LeadEmailRepository emailRepo;
    private final RabbitTemplate rabbitTemplate;

    private static final String LEADS_EXCHANGE = "aviqr.leads";

    private boolean isStaff(String role) { return "ADMIN".equals(role) || "SUPPORT".equals(role); }

    // ── Leads ────────────────────────────────────────────────────────────────
    @PostMapping("/api/v1/leads")
    public ResponseEntity<ApiResponse<Lead>> create(
            @Valid @RequestBody LeadRequest req,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Lead created", leadRepo.save(toEntity(req, new Lead()))));
    }

    // Bulk import — every row must carry its own consentBasis (enforced by
    // LeadRequest's @NotBlank), so a list pasted in without one fails validation
    // per-row rather than silently creating undocumented cold-contact leads.
    @PostMapping("/api/v1/leads/import")
    public ResponseEntity<ApiResponse<List<Lead>>> bulkImport(
            @Valid @RequestBody LeadImportRequest req,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        if (req.getLeads() == null || req.getLeads().isEmpty())
            return ResponseEntity.badRequest().body(ApiResponse.error("No rows to import"));
        List<Lead> saved = req.getLeads().stream()
            .map(r -> leadRepo.save(toEntity(r, new Lead())))
            .toList();
        return ResponseEntity.ok(ApiResponse.ok(saved.size() + " lead(s) imported", saved));
    }

    @GetMapping("/api/v1/leads")
    public ResponseEntity<ApiResponse<Page<Lead>>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        Pageable pg = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Lead> result = q != null && !q.isBlank() ? leadRepo.search(q, pg)
            : status != null ? leadRepo.findByStatus(LeadStatus.valueOf(status.toUpperCase()), pg)
            : leadRepo.findAll(pg);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/api/v1/leads/stats")
    public ResponseEntity<ApiResponse<Map<String, Long>>> stats(
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        Map<String, Long> m = new LinkedHashMap<>();
        for (LeadStatus s : LeadStatus.values()) m.put(s.name().toLowerCase(), leadRepo.countByStatus(s));
        return ResponseEntity.ok(ApiResponse.ok(m));
    }

    @GetMapping("/api/v1/leads/{id}")
    public ResponseEntity<ApiResponse<Lead>> get(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return leadRepo.findById(id).map(l -> ResponseEntity.ok(ApiResponse.ok(l)))
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/api/v1/leads/{id}")
    public ResponseEntity<ApiResponse<Lead>> update(
            @PathVariable UUID id, @Valid @RequestBody LeadRequest req,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return leadRepo.findById(id)
            .map(l -> ResponseEntity.ok(ApiResponse.ok("Updated", leadRepo.save(toEntity(req, l)))))
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/api/v1/leads/{id}/status")
    public ResponseEntity<ApiResponse<Lead>> updateStatus(
            @PathVariable UUID id, @RequestParam String status,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return leadRepo.findById(id).map(l -> {
            l.setStatus(LeadStatus.valueOf(status.toUpperCase()));
            return ResponseEntity.ok(ApiResponse.ok("Status updated", leadRepo.save(l)));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Emails (draft + send) ────────────────────────────────────────────────
    @GetMapping("/api/v1/leads/{id}/emails")
    public ResponseEntity<ApiResponse<List<LeadEmail>>> listEmails(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(emailRepo.findByLeadIdOrderByCreatedAtDesc(id)));
    }

    @PostMapping("/api/v1/leads/{id}/emails")
    public ResponseEntity<ApiResponse<LeadEmail>> draftEmail(
            @PathVariable UUID id, @Valid @RequestBody LeadEmailRequest req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        Lead lead = leadRepo.findById(id).orElse(null);
        if (lead == null) return ResponseEntity.notFound().build();
        if (lead.getStatus() == LeadStatus.DO_NOT_CONTACT)
            return ResponseEntity.badRequest().body(ApiResponse.error("This lead is marked Do Not Contact"));
        LeadEmail draft = LeadEmail.builder()
            .leadId(id).subject(req.getSubject()).body(req.getBody())
            .status(LeadEmailStatus.DRAFT).createdBy(uid).build();
        return ResponseEntity.ok(ApiResponse.ok("Draft saved", emailRepo.save(draft)));
    }

    @PutMapping("/api/v1/leads/{id}/emails/{emailId}")
    public ResponseEntity<ApiResponse<LeadEmail>> editDraft(
            @PathVariable UUID id, @PathVariable UUID emailId, @Valid @RequestBody LeadEmailRequest req,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        LeadEmail draft = emailRepo.findById(emailId).orElse(null);
        if (draft == null || !draft.getLeadId().equals(id)) return ResponseEntity.notFound().build();
        if (draft.getStatus() != LeadEmailStatus.DRAFT)
            return ResponseEntity.badRequest().body(ApiResponse.error("Only drafts can be edited"));
        draft.setSubject(req.getSubject());
        draft.setBody(req.getBody());
        return ResponseEntity.ok(ApiResponse.ok("Draft updated", emailRepo.save(draft)));
    }

    // The only path an email actually leaves this service — a staff member
    // explicitly approving one specific drafted email for one specific lead.
    // Nothing in this codebase auto-calls this endpoint (see Phase 2 note in
    // the Lead CRM scope: auto-drafted follow-ups still land as DRAFT, never SENT).
    @PostMapping("/api/v1/leads/{id}/emails/{emailId}/send")
    public ResponseEntity<ApiResponse<LeadEmail>> sendEmail(
            @PathVariable UUID id, @PathVariable UUID emailId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!isStaff(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        Lead lead = leadRepo.findById(id).orElse(null);
        if (lead == null) return ResponseEntity.notFound().build();
        if (lead.getStatus() == LeadStatus.DO_NOT_CONTACT)
            return ResponseEntity.badRequest().body(ApiResponse.error("This lead is marked Do Not Contact"));
        if (lead.getEmail() == null || lead.getEmail().isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("This lead has no email address"));

        LeadEmail draft = emailRepo.findById(emailId).orElse(null);
        if (draft == null || !draft.getLeadId().equals(id)) return ResponseEntity.notFound().build();
        if (draft.getStatus() != LeadEmailStatus.DRAFT)
            return ResponseEntity.badRequest().body(ApiResponse.error("This email was already sent"));

        draft.setStatus(LeadEmailStatus.SENT);
        draft.setSentBy(uid);
        draft.setSentAt(LocalDateTime.now());
        emailRepo.save(draft);

        lead.setLastContactedAt(LocalDateTime.now());
        if (lead.getStatus() == LeadStatus.NEW) lead.setStatus(LeadStatus.CONTACTED);
        leadRepo.save(lead);

        // Fire-and-forget, same pattern as auth-service's user.registered publish —
        // notification-report-review-service's ElasticEmailService does the actual
        // send and appends the compliance footer (sender identity + opt-out link).
        rabbitTemplate.convertAndSend(LEADS_EXCHANGE, "lead.email.send", Map.of(
            "leadEmailId", draft.getId().toString(),
            "to", lead.getEmail(),
            "subject", draft.getSubject(),
            "body", draft.getBody()
        ));

        return ResponseEntity.ok(ApiResponse.ok("Email sent", draft));
    }

    private Lead toEntity(LeadRequest req, Lead l) {
        l.setBusinessName(req.getBusinessName());
        l.setContactName(req.getContactName());
        l.setPhone(req.getPhone());
        l.setEmail(req.getEmail());
        l.setCity(req.getCity());
        l.setConsentBasis(req.getConsentBasis());
        if (req.getNotes() != null) l.setNotes(req.getNotes());
        if (req.getAssignedTo() != null) l.setAssignedTo(req.getAssignedTo());
        return l;
    }
}
