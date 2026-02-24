import { encrypt, decrypt } from './src/lib/crypto';

try {
    console.log("Testing encryption...");
    const secret = "hello-world";
    const enc = encrypt(secret);
    console.log("Encrypted:", enc);
    const dec = decrypt(enc);
    console.log("Decrypted:", dec);
    if (secret === dec) {
        console.log("Crypto test PASSED!");
    } else {
        console.error("Crypto test FAILED: Mismatch");
    }
} catch (err) {
    console.error("CRYPTO ERROR:", err);
}
