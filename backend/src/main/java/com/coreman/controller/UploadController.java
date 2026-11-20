package com.coreman.controller;

import com.coreman.exception.BadRequestException;
import com.coreman.exception.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Photos uploaded in Admin (products, categories, sale banners). Stored on this server's disk,
 * so they're included in neither git nor the database — back up the upload folder too.
 */
@Slf4j
@RestController
public class UploadController {

    private static final Pattern NAME = Pattern.compile("[a-f0-9]{32}\\.(jpg|png|webp|gif)");
    private static final Map<String, MediaType> TYPES = Map.of(
            "jpg", MediaType.IMAGE_JPEG, "png", MediaType.IMAGE_PNG,
            "webp", MediaType.parseMediaType("image/webp"), "gif", MediaType.IMAGE_GIF);

    private final Path dir;

    public UploadController(@Value("${coreman.upload-dir}") String uploadDir) {
        this.dir = Path.of(uploadDir).toAbsolutePath().normalize();
        log.info("[UPLOAD] Admin photos are stored in {}", dir);
    }

    /** Admin only (under /api/admin). Returns {"url": "/api/uploads/<name>"}. */
    @PostMapping("/api/admin/uploads")
    public ResponseEntity<Map<String, String>> upload(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) throw new BadRequestException("The file is empty.");
        String ext;
        try (InputStream in = file.getInputStream()) {
            ext = sniff(in.readNBytes(12)); // trust the bytes, not the file name or browser-sent type
        }
        if (ext == null) throw new BadRequestException("Only JPG, PNG, WebP or GIF images can be uploaded.");
        String name = UUID.randomUUID().toString().replace("-", "") + "." + ext;
        Files.createDirectories(dir);
        file.transferTo(dir.resolve(name));
        log.info("[ADMIN] Uploaded image {} ({} KB)", name, file.getSize() / 1024);
        return ResponseEntity.ok(Map.of("url", "/api/uploads/" + name));
    }

    @GetMapping("/api/uploads/{name}")
    public ResponseEntity<Resource> get(@PathVariable String name) {
        if (!NAME.matcher(name).matches()) throw new ResourceNotFoundException("Not found");
        Path f = dir.resolve(name);
        if (!Files.isRegularFile(f)) throw new ResourceNotFoundException("Not found");
        return ResponseEntity.ok()
                .contentType(TYPES.get(name.substring(name.lastIndexOf('.') + 1)))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable()) // names never get reused
                .header("X-Content-Type-Options", "nosniff")
                .body(new FileSystemResource(f));
    }

    private static String sniff(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xff) == 0xFF && (b[1] & 0xff) == 0xD8 && (b[2] & 0xff) == 0xFF) return "jpg";
        if (b.length >= 8 && (b[0] & 0xff) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return "png";
        if (b.length >= 6 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8') return "gif";
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "webp";
        return null;
    }
}
