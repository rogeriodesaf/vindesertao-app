package org.vindesertao.visit;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.TreeMap;

@ApplicationScoped
public class PhotoStorageService {
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @ConfigProperty(name = "app.cloudinary.cloud-name")
    Optional<String> cloudName;

    @ConfigProperty(name = "app.cloudinary.api-key")
    Optional<String> apiKey;

    @ConfigProperty(name = "app.cloudinary.api-secret")
    Optional<String> apiSecret;

    @ConfigProperty(name = "app.cloudinary.folder")
    String folder;

    @Inject
    ObjectMapper mapper;

    public boolean cloudinaryEnabled() {
        return present(cloudName) && present(apiKey) && present(apiSecret);
    }

    public StoredPhoto upload(String dataUrl, String fileName) {
        if (!cloudinaryEnabled()) {
            return StoredPhoto.local(dataUrl);
        }

        long timestamp = Instant.now().getEpochSecond();
        TreeMap<String, String> signatureParams = new TreeMap<>();
        signatureParams.put("folder", folder);
        signatureParams.put("timestamp", String.valueOf(timestamp));

        String signature = signature(signatureParams);
        String body = form(
                "file", dataUrl,
                "api_key", apiKey.orElseThrow(),
                "timestamp", String.valueOf(timestamp),
                "folder", folder,
                "signature", signature
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.cloudinary.com/v1_1/" + encodePath(cloudName.orElseThrow()) + "/image/upload"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("Cloudinary recusou o upload da foto: " + response.body());
            }
            var json = mapper.readTree(response.body());
            String url = json.path("secure_url").asText(null);
            String publicId = json.path("public_id").asText(null);
            if (url == null || url.isBlank()) {
                throw new IllegalStateException("Cloudinary nao retornou a URL da foto.");
            }
            return new StoredPhoto(url, publicId, null);
        } catch (IOException exception) {
            throw new IllegalStateException("Nao foi possivel enviar a foto para o Cloudinary.", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Upload da foto interrompido.", exception);
        }
    }

    private String signature(TreeMap<String, String> params) {
        StringBuilder payload = new StringBuilder();
        params.forEach((key, value) -> {
            if (!payload.isEmpty()) {
                payload.append('&');
            }
            payload.append(key).append('=').append(value);
        });
        payload.append(apiSecret.orElseThrow());
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-1");
            return HexFormat.of().formatHex(digest.digest(payload.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-1 indisponivel para assinar upload.", exception);
        }
    }

    private String form(String... entries) {
        StringBuilder body = new StringBuilder();
        for (int index = 0; index < entries.length; index += 2) {
            if (!body.isEmpty()) {
                body.append('&');
            }
            body.append(url(entries[index])).append('=').append(url(entries[index + 1]));
        }
        return body.toString();
    }

    private String url(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private String encodePath(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private boolean present(Optional<String> value) {
        return value.isPresent() && !value.orElse("").isBlank();
    }

    public record StoredPhoto(String url, String publicId, String localData) {
        static StoredPhoto local(String data) {
            return new StoredPhoto(null, null, data);
        }
    }
}
