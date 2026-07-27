package org.vindesertao.visit;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import jakarta.enterprise.context.ApplicationScoped;

import java.io.IOException;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@ApplicationScoped
public class PhotoStorageService {
    private static final String DEFAULT_FOLDER = "vinde-sertao/visitas";

    private final boolean enabled;
    private final String folder;
    private final UploadClient uploadClient;

    public PhotoStorageService() {
        this(
                environment("CLOUDINARY_CLOUD_NAME"),
                environment("CLOUDINARY_API_KEY"),
                environment("CLOUDINARY_API_SECRET"),
                environment("CLOUDINARY_FOLDER")
        );
    }

    PhotoStorageService(String cloudName, String apiKey, String apiSecret, String folder) {
        this(cloudName, apiKey, apiSecret, folder, cloudinaryClient(cloudName, apiKey, apiSecret));
    }

    PhotoStorageService(String cloudName, String apiKey, String apiSecret, String folder, UploadClient uploadClient) {
        this.enabled = present(cloudName) && present(apiKey) && present(apiSecret);
        this.folder = present(folder) ? folder.trim() : DEFAULT_FOLDER;
        this.uploadClient = uploadClient;
    }

    public boolean cloudinaryEnabled() {
        return enabled;
    }

    public StoredPhoto upload(String photoData, String fileName) {
        if (!cloudinaryEnabled()) {
            return StoredPhoto.local(photoData);
        }

        byte[] image = decode(photoData);
        Map<String, Object> parameters = new LinkedHashMap<>();
        parameters.put("timestamp", Instant.now().getEpochSecond());
        parameters.put("folder", folder);
        parameters.put("resource_type", "image");

        try {
            Map<?, ?> result = uploadClient.upload(image, parameters);
            String url = text(result.get("secure_url"));
            String publicId = text(result.get("public_id"));
            if (!present(url)) {
                throw new IllegalStateException("Cloudinary nao retornou a secure_url da foto.");
            }
            return new StoredPhoto(url, publicId, null);
        } catch (IOException exception) {
            throw new IllegalStateException("Nao foi possivel enviar a foto para o Cloudinary: " + exception.getMessage(), exception);
        }
    }

    private byte[] decode(String photoData) {
        if (!present(photoData)) {
            throw new IllegalArgumentException("A foto enviada esta vazia.");
        }
        String encoded = photoData.trim();
        int separator = encoded.indexOf(',');
        if (encoded.startsWith("data:") && separator >= 0) {
            encoded = encoded.substring(separator + 1);
        }
        try {
            return Base64.getMimeDecoder().decode(encoded);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("A foto enviada nao possui Base64 valido.", exception);
        }
    }

    private static UploadClient cloudinaryClient(String cloudName, String apiKey, String apiSecret) {
        if (!present(cloudName) || !present(apiKey) || !present(apiSecret)) {
            return (image, parameters) -> Map.of();
        }
        Cloudinary cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", credential(cloudName),
                "api_key", credential(apiKey),
                "api_secret", credential(apiSecret),
                "secure", true
        ));
        return (image, parameters) -> cloudinary.uploader().upload(image, parameters);
    }

    private static String environment(String name) {
        return System.getenv(name);
    }

    private static boolean present(String value) {
        return value != null && !value.isBlank();
    }

    private static String credential(String value) {
        String normalized = value.trim();
        if (normalized.length() >= 2
                && ((normalized.startsWith("\"") && normalized.endsWith("\""))
                || (normalized.startsWith("'") && normalized.endsWith("'")))) {
            normalized = normalized.substring(1, normalized.length() - 1).trim();
        }
        return normalized;
    }

    private static String text(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    @FunctionalInterface
    interface UploadClient {
        Map<?, ?> upload(byte[] image, Map<String, Object> parameters) throws IOException;
    }

    public record StoredPhoto(String url, String publicId, String localData) {
        static StoredPhoto local(String data) {
            return new StoredPhoto(null, null, data);
        }
    }
}
