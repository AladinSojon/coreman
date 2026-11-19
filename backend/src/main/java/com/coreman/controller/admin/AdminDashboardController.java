package com.coreman.controller.admin;

import com.coreman.service.AdminAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminAnalyticsService analyticsService;

    @GetMapping
    public ResponseEntity<AdminAnalyticsService.Dashboard> getDashboard() {
        return ResponseEntity.ok(analyticsService.dashboard());
    }
}
