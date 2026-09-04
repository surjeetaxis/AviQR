package in.aviqr.pms.service;

import in.aviqr.pms.entity.Agent;
import in.aviqr.pms.repository.AgentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class AgentService {

    private final AgentRepository agentRepo;

    public Agent create(Agent req) {
        req.setId(null);
        req.setActive(true);
        return agentRepo.save(req);
    }

    public List<Agent> listForHotel(UUID hotelId) {
        return agentRepo.findByHotelIdAndActiveTrue(hotelId);
    }

    public Agent get(UUID id) {
        return agentRepo.findById(id).orElseThrow(() -> new RuntimeException("Agent not found: " + id));
    }

    public Agent update(UUID id, Agent req) {
        Agent existing = get(id);
        existing.setName(req.getName());
        existing.setContactPerson(req.getContactPerson());
        existing.setPhone(req.getPhone());
        existing.setEmail(req.getEmail());
        existing.setCommissionPercent(req.getCommissionPercent());
        if (req.getTdsPercent() != null) existing.setTdsPercent(req.getTdsPercent());
        existing.setNotes(req.getNotes());
        if (req.getActive() != null) existing.setActive(req.getActive());
        return agentRepo.save(existing);
    }
}
