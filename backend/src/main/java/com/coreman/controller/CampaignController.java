package com.coreman.controller;

import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.Campaign;
import com.coreman.repository.CampaignRepository;
import com.coreman.service.CampaignService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

/** Public sale info for the shop: banners, the top strip and /sale/{slug} pages. */
@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
public class CampaignController {

    private final CampaignService campaignService;
    private final CampaignRepository campaignRepository;

    public record PublicCampaign(String name, String slug, int discountPercent, String headline, String subheadline,
                                 String announcement, String bannerImageUrl, String theme, boolean showCountdown,
                                 Instant startsAt, Instant endsAt, String status) {
        static PublicCampaign of(Campaign c, Instant now) {
            return new PublicCampaign(c.getName(), c.getSlug(), c.getDiscountPercent(), c.getHeadline(), c.getSubheadline(),
                    c.getAnnouncement(), c.getBannerImageUrl(), c.getTheme(), Boolean.TRUE.equals(c.getShowCountdown()),
                    c.getStartsAt(), c.getEndsAt(), c.status(now));
        }
    }

    /** Campaigns live right now, biggest discount first. */
    @GetMapping("/live")
    public ResponseEntity<List<PublicCampaign>> live() {
        Instant now = Instant.now();
        return ResponseEntity.ok(campaignService.live().stream().map(l -> PublicCampaign.of(l.campaign(), now)).toList());
    }

    /** One sale page; switched-off campaigns are hidden. */
    @GetMapping("/{slug}")
    public ResponseEntity<PublicCampaign> get(@PathVariable String slug) {
        Campaign c = campaignRepository.findBySlug(slug)
                .filter(x -> Boolean.TRUE.equals(x.getEnabled()))
                .orElseThrow(() -> new ResourceNotFoundException("Sale not found"));
        return ResponseEntity.ok(PublicCampaign.of(c, Instant.now()));
    }
}
