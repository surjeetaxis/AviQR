package in.aviqr.auth.service;
import in.aviqr.auth.repository.SecurityNoticeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import java.time.LocalDateTime;
import java.util.*;
@Service @RequiredArgsConstructor @EnableScheduling
public class SecurityNoticePublisher {
 private final SecurityNoticeRepository notices; private final RabbitTemplate rabbit;
 @Scheduled(fixedDelayString="${app.security.notice-delay-ms:10000}") @Transactional
 public void publish(){for(var notice:notices.pending(LocalDateTime.now())){
  try{rabbit.invoke(operations->{operations.convertAndSend("aviqr.users","security.notice",Map.of("id",notice.getId().toString(),"userId",notice.getUserId().toString(),"email",notice.getEmail(),"kind",notice.getKind(),"status",notice.getStatus()==null?"UNKNOWN":notice.getStatus(),"message",notice.getMessage(),"ip",notice.getIpAddress()==null?"unknown":notice.getIpAddress()));operations.waitForConfirmsOrDie(5000);return null;});notice.setSentAt(LocalDateTime.now());}
  catch(Exception e){notice.setAttempts(notice.getAttempts()+1);notice.setNextAttemptAt(LocalDateTime.now().plusSeconds(Math.min(3600,30L << Math.min(notice.getAttempts(),7))));}
  notices.save(notice);
 }}
}
