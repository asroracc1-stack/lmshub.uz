package com.lmscrm.backend.service.ai;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;

public class EncryptionUtils {

    private static final String ALGORITHM = "AES/CBC/PKCS5Padding";
    // 32 bytes for AES-256 key
    private static final byte[] KEY_BYTES = "LMSHubEnterpriseFaceIDSecretKey!".getBytes();

    public static byte[] encryptEmbedding(float[] vector) {
        try {
            ByteBuffer byteBuffer = ByteBuffer.allocate(vector.length * 4);
            for (float f : vector) {
                byteBuffer.putFloat(f);
            }
            byte[] plainBytes = byteBuffer.array();

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            byte[] iv = new byte[16];
            new SecureRandom().nextBytes(iv);
            IvParameterSpec ivSpec = new IvParameterSpec(iv);
            SecretKeySpec keySpec = new SecretKeySpec(KEY_BYTES, "AES");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, ivSpec);
            byte[] cipherBytes = cipher.doFinal(plainBytes);

            byte[] result = new byte[iv.length + cipherBytes.length];
            System.arraycopy(iv, 0, result, 0, iv.length);
            System.arraycopy(cipherBytes, 0, result, iv.length, cipherBytes.length);
            return result;
        } catch (Exception e) {
            throw new RuntimeException("AES-256 Encryption failed", e);
        }
    }

    public static float[] decryptEmbedding(byte[] encryptedData) {
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            byte[] iv = new byte[16];
            System.arraycopy(encryptedData, 0, iv, 0, iv.length);
            IvParameterSpec ivSpec = new IvParameterSpec(iv);

            int cipherLength = encryptedData.length - iv.length;
            byte[] cipherBytes = new byte[cipherLength];
            System.arraycopy(encryptedData, iv.length, cipherBytes, 0, cipherLength);

            SecretKeySpec keySpec = new SecretKeySpec(KEY_BYTES, "AES");
            cipher.init(Cipher.DECRYPT_MODE, keySpec, ivSpec);
            byte[] plainBytes = cipher.doFinal(cipherBytes);

            ByteBuffer byteBuffer = ByteBuffer.wrap(plainBytes);
            float[] vector = new float[plainBytes.length / 4];
            for (int i = 0; i < vector.length; i++) {
                vector[i] = byteBuffer.getFloat();
            }
            return vector;
        } catch (Exception e) {
            throw new RuntimeException("AES-256 Decryption failed", e);
        }
    }
}
