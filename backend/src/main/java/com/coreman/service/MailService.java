package com.coreman.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Sends plain-text emails in the background. Off when MAIL_HOST isn't set. */
@Slf4j
@Service
public class MailService {

    private final ObjectProvider<JavaMailSender> sender;
    private final String host;
    private final String from;
    // One background thread: requests return at once (so response time doesn't reveal whether an account exists).
    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "mail-sender");
        t.setDaemon(true);
        return t;
    });

    public MailService(ObjectProvider<JavaMailSender> sender,
                       @Value("${spring.mail.host:}") String host,
                       @Value("${spring.mail.username:}") String username,
                       @Value("${coreman.mail-from:}") String from) {
        this.sender = sender;
        this.host = host;
        this.from = from != null && !from.isBlank() ? from : username;
    }

    public boolean isEnabled() {
        return host != null && !host.isBlank() && sender.getIfAvailable() != null;
    }

    public void send(String to, String subject, String body) {
        if (!isEnabled()) return;
        executor.submit(() -> {
            try {
                SimpleMailMessage m = new SimpleMailMessage();
                if (from != null && !from.isBlank()) m.setFrom(from);
                m.setTo(to);
                m.setSubject(subject);
                m.setText(body);
                sender.getObject().send(m);
                log.info("[MAIL] Sent \"{}\"", subject);
            } catch (Exception e) {
                log.error("[MAIL] Could not send \"{}\": {}", subject, e.getMessage());
            }
        });
    }
}
