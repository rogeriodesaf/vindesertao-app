package org.vindesertao.visit;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class PhotoStorageServiceTest {
    @Test
    void uploadsJpegDataUrlAsDecodedBytesUsingOnlySdkUploadOptions() {
        AtomicReference<byte[]> uploaded = new AtomicReference<>();
        AtomicReference<Map<String, Object>> parameters = new AtomicReference<>();
        var service = service(uploaded, parameters, "jpeg-id");

        var result = service.upload("data:image/jpeg;base64,/9j/2Q==", "foto.jpg");

        assertArrayEquals(new byte[]{(byte) 0xff, (byte) 0xd8, (byte) 0xff, (byte) 0xd9}, uploaded.get());
        assertUploadParameters(parameters.get());
        assertEquals("https://res.cloudinary.com/test/image/upload/jpeg-id.jpg", result.url());
        assertEquals("jpeg-id", result.publicId());
        assertNull(result.localData());
    }

    @Test
    void uploadsPngDataUrlAsDecodedBytes() {
        AtomicReference<byte[]> uploaded = new AtomicReference<>();
        AtomicReference<Map<String, Object>> parameters = new AtomicReference<>();
        var service = service(uploaded, parameters, "png-id");

        service.upload("data:image/png;base64,iVBORw0KGgo=", "foto.png");

        assertArrayEquals(new byte[]{
                (byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
        }, uploaded.get());
        assertUploadParameters(parameters.get());
    }

    @Test
    void keepsBase64LocallyWhenCloudinaryIsNotConfigured() {
        var service = new PhotoStorageService(null, null, null, null);
        String photo = "data:image/jpeg;base64,/9j/2Q==";

        var result = service.upload(photo, "foto.jpg");

        assertEquals(photo, result.localData());
        assertNull(result.url());
        assertNull(result.publicId());
    }

    private PhotoStorageService service(AtomicReference<byte[]> uploaded,
                                        AtomicReference<Map<String, Object>> parameters,
                                        String publicId) {
        return new PhotoStorageService(
                "cloud", "key", "secret", " vinde-sertao/visitas ",
                (image, options) -> {
                    uploaded.set(image);
                    parameters.set(options);
                    return Map.of(
                            "secure_url", "https://res.cloudinary.com/test/image/upload/" + publicId + ".jpg",
                            "public_id", publicId
                    );
                }
        );
    }

    private void assertUploadParameters(Map<String, Object> parameters) {
        assertEquals("vinde-sertao/visitas", parameters.get("folder"));
        assertEquals(1, parameters.size());
        assertFalse(parameters.containsKey("timestamp"));
        assertFalse(parameters.containsKey("signature"));
        assertFalse(parameters.containsKey("api_secret"));
    }
}
