import pkg from "libsodium-wrappers";
const { base64_variants } = pkg;
import _sodium from 'libsodium-wrappers';

const stagingDetails = {
  subscriber_id: process.env.ONDC_SUBSCRIPTION_ID,
  ukId: process.env.ONDC_UK_ID,
  signing_public_key: process.env.ONDC_SIGNING_PUBLIC_KEY,
  encr_public_key: process.env.ONDC_ENCRYPTION_PUBLIC_KEY,
};

export const createKeyPair = async () => {
  await _sodium.ready;
  const sodium = _sodium;
  const { publicKey, privateKey } = sodium.crypto_sign_keypair();
  console.log("Generated Key Pair:", {
    publicKey: sodium.to_base64(publicKey, base64_variants.ORIGINAL),
    privateKey: sodium.to_base64(privateKey, base64_variants.ORIGINAL),
  });
  return {
    publicKey: sodium.to_base64(publicKey, base64_variants.ORIGINAL),
    privateKey: sodium.to_base64(privateKey, base64_variants.ORIGINAL),
  };
};

export const createSigningString = async (message, created, expires) => {
  await _sodium.ready;
  const sodium = _sodium;
  if (!created) created = Math.floor(Date.now() / 1000).toString();
  if (!expires) expires = (parseInt(created) + 3600).toString();

  console.log("Message for Signing String:", message);
  const digest = sodium.crypto_generichash(
    64,
    sodium.from_string(message)
  );
  const digestBase64 = sodium.to_base64(digest, base64_variants.ORIGINAL);

  const signingString = `(created): ${created}\n(expires): ${expires}\ndigest: BLAKE-512=${digestBase64}`;
  console.log("Generated Signing String:", signingString);

  return { signingString, created, expires };
};

export const signMessage = async (signingString, privateKey) => {
  await _sodium.ready;
  const sodium = _sodium;
  console.log("Signing String to be Signed:", signingString);

  const signedMessage = sodium.crypto_sign_detached(
    signingString,
    sodium.from_base64(privateKey, base64_variants.ORIGINAL)
  );

  const signature = sodium.to_base64(signedMessage, base64_variants.ORIGINAL);
  console.log("Generated Signature:", signature);
  return signature;
};

export const createAuthorizationHeader = async (message, privateKey) => {
  const { signingString, created, expires } = await createSigningString(
    JSON.stringify(message)
  );

  const signature = await signMessage(signingString, privateKey);

  const header = `Signature keyId="${stagingDetails.subscriber_id}|${stagingDetails.ukId}|ed25519",algorithm="ed25519",created="${created}",expires="${expires}",headers="(created) (expires) digest",signature="${signature}"`;

  console.log("Authorization Header:", header);
  return header;
};

export const verifyMessage = async (signedString, signingString, publicKey) => {
  try {
    await _sodium.ready;
    const sodium = _sodium;
    console.log("Verifying Signature:", signedString);
    const isValid = sodium.crypto_sign_verify_detached(
      sodium.from_base64(signedString, base64_variants.ORIGINAL),
      signingString,
      sodium.from_base64(publicKey, base64_variants.ORIGINAL)
    );
    console.log("Signature Validity:", isValid);
    return isValid;
  } catch (error) {
    console.error("Error Verifying Message:", error);
    return false;
  }
};
